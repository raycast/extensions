# Haystack

> Organize anything by capturing screenshots

Turn your screenshots into structured data. Haystack uses AI to extract information from your screenshots and organize it exactly how you want.

## Getting Started

### 1. Configure Your OpenAI API Key

Before you can start capturing, you'll need an OpenAI API key. Here's how to get one:

1. Head over to [OpenAI's platform](https://platform.openai.com/)
2. Sign up or log in to your account
3. Navigate to [API Keys](https://platform.openai.com/api-keys)
4. Click "Create new secret key"
5. Copy your new API key
6. Open Haystack in Raycast and paste it into the preferences

**Why do we need this?** Haystack uses OpenAI's vision models to look at your screenshots and extract the data you care about.

**Privacy note:** Your screenshots are sent to OpenAI's API for processing. Make sure you're comfortable with this before using the extension. Haystack doesn't store or transmit your data anywhere else.

### 2. Create Your First Stack

Think of stacks as smart folders that know exactly what to look for in your screenshots. Before you can capture anything, you need to create at least one stack.

**What's a stack?** It's a collection template that defines what information you want to extract. For example:

- **Plane Tickets Stack**: Extract airline, price, departure date, destination
- **Concert Events Stack**: Capture artist name, venue, date, ticket price
- **Package Tracking Stack**: Grab tracking number, carrier, expected delivery
- **Restaurant Recommendations**: Save name, cuisine type, location, price range

**How to create a stack:**

1. Run `Create New Stack` command in Raycast
2. Give it a descriptive name (e.g., "Plane Tickets")
3. Choose an icon that makes sense
4. Describe what you want to collect in plain English
5. List the fields you want to extract (e.g., "airline, price, date, destination")

Haystack's AI will automatically generate the appropriate fields based on your description. You can always edit, add, or remove fields later!

## Capturing Screenshots

Once you have at least one stack set up, you're ready to start capturing:

1. Run `Create New Capture` command
2. Take a screenshot of whatever you want to organize
3. Haystack's AI will:
   - Analyze the screenshot
   - Figure out which stack it belongs to
   - Extract all the relevant information
   - Save it automatically

That's it! Your capture is now organized and searchable.

**Tip:** Assign a keyboard shortcut to the `Create New Capture` command for quick captures!

## Managing Your Data

### Browse Captures

Use `List All Captures` to see everything you've captured. You can:
- Search through your captures
- View full details and the original screenshot
- Delete captures you no longer need

### Manage Stacks

Use `List All Stacks` to:
- View all your stacks
- Edit stack details
- Add or remove fields
- Delete stacks

### Chat with Your Capture

Use natural language to query your collection and get instant answers.

## Pro Tips

- **Be specific with stack descriptions**: The more detail you provide, the better the AI understands what to extract
- **Use descriptive field names**: Instead of "info1", use "departure_time" or "ticket_price"
- **Create focused stacks**: Rather than one mega-stack, create specific stacks for different purposes
- **Mark title fields wisely**: At least one field should be marked as a title field - it's what you'll see in the list view

---

Made with ❤️ for people who screenshot everything
