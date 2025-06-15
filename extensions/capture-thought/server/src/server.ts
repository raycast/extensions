import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import bodyParser from 'body-parser';
import { Client } from '@notionhq/client';
import OpenAI from 'openai';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Initialize clients
const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Types
interface ThoughtInput {
  text: string;
  context?: 'clipboard' | 'selection' | 'dictation';
}

interface AIClassification {
  title: string;
  description: string;
  type: 'Task' | 'Idea' | 'Concern' | 'Decision' | 'Question' | 'Note';
  priority: 'Urgent' | 'High' | 'Medium' | 'Low';
  category: 'Work' | 'Personal';
  dueDate?: string;
}

interface CreateThoughtRequest {
  title: string;
  description: string;
  type: string;
  priority: string;
  category: string;
  dueDate?: string;
  rawInput?: {
    text: string;
    source?: string;
    timestamp?: string;
  };
}

// AI Classification Function
async function classifyThought(input: ThoughtInput): Promise<AIClassification> {
  const systemPrompt = `You are an AI assistant that classifies thoughts and creates structured summaries.

Given a thought, classify it according to these rules:

TYPE:
- Task: Actionable items that need to be done (use imperative form for title: "Follow up with supplier")
- Idea: Creative thoughts, suggestions, improvements (descriptive form: "Idea: dynamic rebate timeline")
- Concern: Worries, issues, problems to address
- Decision: Choices that need to be made
- Question: Things to research or ask others
- Note: Information to remember, observations

PRIORITY:
- Urgent: Needs immediate attention (deadlines today/tomorrow)
- High: Important, should be done soon (this week)
- Medium: Important but not time-sensitive (this month)
- Low: Nice to have, when time permits

CATEGORY:
- Work: Professional, business-related thoughts
- Personal: Personal life, health, hobbies, family (look for hints like "doctor", "oil change", "grocery", "gym", etc.)

Generate a clear, concise title and an expanded description, following these rules:
- If TYPE is "Task": Title should be an imperative, actionable to-do (e.g., "Email the client about the proposal"). Description should clarify the task and any relevant details.
- If TYPE is "Idea": Title should start with "Idea:" and summarize the concept. Description should elaborate on the idea and its potential value.
- If TYPE is "Concern": Title should start with "Concern:" and summarize the issue. Description should explain the concern and its implications.
- If TYPE is "Decision": Title should start with "Decision:" and state the choice to be made. Description should outline the options and context.
- If TYPE is "Question": Title should be a direct question. Description should provide any background or context for the question.
- If TYPE is "Note": Title should summarize the information. Description should provide the details or observation.

Return ONLY a JSON object with this exact structure:
{
  "title": "string",
  "description": "string", 
  "type": "Task|Idea|Concern|Decision|Question|Note",
  "priority": "Urgent|High|Medium|Low",
  "category": "Work|Personal"
}`;

  const userPrompt = `Context: ${input.context || 'clipboard'}
Thought: "${input.text}"`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 500
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    const classification = JSON.parse(content) as AIClassification;
    
    // Validate the response
    const validTypes = ['Task', 'Idea', 'Concern', 'Decision', 'Question', 'Note'];
    const validPriorities = ['Urgent', 'High', 'Medium', 'Low'];
    const validCategories = ['Work', 'Personal'];
    
    if (!validTypes.includes(classification.type) ||
        !validPriorities.includes(classification.priority) ||
        !validCategories.includes(classification.category)) {
      throw new Error('Invalid classification response');
    }

    return classification;
  } catch (error) {
    console.error('AI Classification error:', error);
    // Fallback classification
    return {
      title: input.text.slice(0, 100) + (input.text.length > 100 ? '...' : ''),
      description: input.text,
      type: 'Note',
      priority: 'Medium',
      category: 'Work'
    };
  }
}

// Notion Database Functions
async function createNotionThought(thought: CreateThoughtRequest): Promise<string> {
  try {
    const response = await notion.pages.create({
      parent: {
        database_id: process.env.NOTION_DATABASE_ID!,
      },
      properties: {
        Name: {
          title: [
            {
              text: {
                content: thought.title,
              },
            },
          ],
        },
        Type: {
          select: {
            name: thought.type,
          },
        },
        Priority: {
          select: {
            name: thought.priority,
          },
        },
        Category: {
          select: {
            name: thought.category,
          },
        },
        Status: {
          status: {
            name: 'To Do',
          },
        },
        ...(thought.dueDate && {
          'Due Date': {
            date: {
              start: thought.dueDate,
            },
          },
        }),
      },
      children: [
        {
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: thought.description,
                },
              },
            ],
          },
        },
        // Add divider and raw input as quote if available
        ...(thought.rawInput && thought.rawInput.text ? [
          { type: 'divider', divider: {} } as any,
          {
            type: 'quote',
            quote: {
              rich_text: [
                {
                  type: 'text',
                  text: {
                    content: thought.rawInput.text,
                  },
                },
              ],
            },
          },
        ] : []),
      ],
    });

    return response.id;
  } catch (error) {
    console.error('Notion creation error:', error);
    throw new Error('Failed to create thought in Notion');
  }
}

async function getPrioritizedThoughts(category?: string): Promise<any[]> {
  try {
    const filter: any = {
      and: [
        {
          property: 'Status',
          status: {
            does_not_equal: 'Completed',
          },
        },
      ],
    };

    if (category) {
      filter.and.push({
        property: 'Category',
        select: {
          equals: category,
        },
      });
    }

    const response = await notion.databases.query({
      database_id: process.env.NOTION_DATABASE_ID!,
      filter,
      sorts: [
        {
          property: 'Health',
          direction: 'ascending',
        },
      ],
      page_size: 3,
    });

    return response.results.map((page: any) => ({
      id: page.id,
      title: page.properties.Name?.title?.[0]?.plain_text || '',
      description: page.properties.Description?.rich_text?.[0]?.plain_text || '',
      type: page.properties.Type?.select?.name || '',
      priority: page.properties.Priority?.select?.name || '',
      category: page.properties.Category?.select?.name || '',
      status: page.properties.Status?.select?.name || '',
      created: page.created_time,
      health: page.properties.Health?.formula?.number || 0,
      dueDate: page.properties['Due Date']?.date?.start,
    }));
  } catch (error) {
    console.error('Notion query error:', error);
    throw new Error('Failed to fetch priorities from Notion');
  }
}

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Capture Thought Server is running!' });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Draft endpoint - AI classification
app.post('/draft', async (req, res) => {
  try {
    const { text, context } = req.body as ThoughtInput;
    
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const classification = await classifyThought({ text, context });
    
    res.json({ classification });
  } catch (error) {
    console.error('Draft endpoint error:', error);
    res.status(500).json({ error: 'Failed to classify thought' });
  }
});

// Create endpoint - Save to Notion
app.post('/create', async (req, res) => {
  try {
    console.log("Incoming /create body:", JSON.stringify(req.body, null, 2));
    // Handle both raw JSON (Raycast) and wrapped JSON (iOS Shortcuts)
    let thought: CreateThoughtRequest;
    
    if (req.body.data) {
      let data = req.body.data;
      // If data is a string, parse it
      if (typeof data === "string") {
        try {
          data = JSON.parse(data);
        } catch (e) {
          return res.status(400).json({ error: "Invalid JSON in data field" });
        }
      }
      // Now handle classification wrapper
      if (data.classification && typeof data.classification === "object") {
        thought = data.classification as CreateThoughtRequest;
      } else {
        thought = data as CreateThoughtRequest;
      }
    } else {
      // Direct format (Raycast) or check for classification wrapper
      if (req.body.classification && typeof req.body.classification === 'object') {
        thought = req.body.classification as CreateThoughtRequest;
      } else {
        thought = req.body as CreateThoughtRequest;
      }
    }
    
    if (!thought.title || !thought.description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    const id = await createNotionThought(thought);
    
    res.json({ success: true, id });
  } catch (error) {
    console.error('Create endpoint error:', error);
    res.status(500).json({ success: false, error: 'Failed to create thought' });
  }
});

// Priorities endpoint - Get prioritized thoughts
app.get('/priorities', async (req, res) => {
  try {
    const { category } = req.query;
    
    let categoryFilter: string | undefined;
    if (category === 'work') categoryFilter = 'Work';
    else if (category === 'personal') categoryFilter = 'Personal';
    
    const thoughts = await getPrioritizedThoughts(categoryFilter);
    
    res.json({ thoughts });
  } catch (error) {
    console.error('Priorities endpoint error:', error);
    res.status(500).json({ error: 'Failed to fetch priorities' });
  }
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Capture Thought Server running on port ${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
}); 