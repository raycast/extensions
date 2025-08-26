import { Action, ActionPanel, Form, Icon, open, showToast, Toast } from "@raycast/api";
import { useState } from "react";

interface FormValues {
  prompt: string;
  useCase: string;
}

const USE_CASES = [
  {
    title: "Personal App",
    value: "personal",
    description: "For individual use - productivity, hobbies, personal projects",
    icon: Icon.Person,
  },
  {
    title: "Internal Tool",
    value: "internal",
    description: "Business tools, dashboards, admin panels, team utilities",
    icon: Icon.Building,
  },
  {
    title: "Customer-Facing Product",
    value: "customer",
    description: "Public websites, e-commerce, customer portals, marketing sites",
    icon: Icon.Globe,
  },
  {
    title: "SaaS Product",
    value: "saas",
    description: "Software as a Service, subscription-based applications",
    icon: Icon.Cloud,
  },
  {
    title: "Marketplace/Platform",
    value: "marketplace",
    description: "Two-sided markets, user-generated content, community platforms",
    icon: Icon.TwoPeople,
  },
  {
    title: "Content/Media Site",
    value: "content",
    description: "Blogs, portfolios, news sites, media sharing platforms",
    icon: Icon.Document,
  },
  {
    title: "Prototype/MVP",
    value: "prototype",
    description: "Quick proof of concept, testing ideas, demo applications",
    icon: Icon.Hammer,
  },
  {
    title: "Other",
    value: "other",
    description: "Something else entirely",
    icon: Icon.QuestionMarkCircle,
  },
];

const EXAMPLE_PROMPTS_BY_USE_CASE = {
  personal: [
    "A personal expense tracker with PostgreSQL database, file upload for receipts, and automated monthly budget reports via cron jobs",
    "A recipe organizer with image uploads for photos, tagging system, meal planning calendar, and grocery list generation",
    "A habit tracking app with user authentication, streak counters stored in database, and daily reminder notifications",
    "A workout planner with exercise database, progress tracking, and automated routine suggestions based on past workouts",
  ],
  internal: [
    "An employee onboarding portal with file storage for documents, task checklists in database, and automated email reminders",
    "A project time tracking dashboard with PostgreSQL for data, real-time updates, client billing calculations, and CSV export",
    "An inventory management system with barcode scanning, stock level alerts via pub/sub, and automated reorder notifications",
    "A team knowledge base with full-text search, collaborative editing, file attachments, and usage analytics",
  ],
  customer: [
    "An e-commerce store with product catalog in database, image storage, payment processing, order tracking, and automated email confirmations",
    "A restaurant website with menu management, online ordering system, table reservations stored in database, and SMS notifications",
    "A service business site with appointment booking, customer database, automated reminder emails, and review collection system",
    "A photography portfolio with image galleries, client proofing system, file downloads, and automated watermarking",
  ],
  saas: [
    "A social media scheduling tool with multi-platform posting, analytics dashboard, team collaboration, and automated posting via cron jobs",
    "An email marketing platform with subscriber database, campaign builder, delivery tracking, and automated drip campaigns",
    "A project management tool with real-time collaboration, file storage, time tracking, automated reports, and team notifications",
    "A customer support system with ticket database, live chat, automated routing, and performance analytics",
  ],
  marketplace: [
    "A freelance marketplace with user profiles, project database, secure messaging, payment escrow, automated matching, and review system",
    "A peer-to-peer rental platform with listing database, booking system, automated payments, insurance verification, and notification system",
    "A local marketplace with item listings, image storage, user messaging, location-based search, and automated moderation alerts",
    "A skill-sharing platform with instructor profiles, course database, video storage, booking system, and automated certificates",
  ],
  content: [
    "A personal blog with markdown editor, comment system, image storage, automated social media posting, and analytics dashboard",
    "A photography portfolio with image galleries, client proofing, automated watermarking, download tracking, and contact management",
    "A podcast website with episode storage, automated transcription, subscriber database, analytics, and RSS feed generation",
    "A news site with article database, user voting system, comment threads, automated content moderation, and trending algorithms",
  ],
  prototype: [
    "A simple voting app with real-time results, user authentication, vote storage in database, and automated result notifications",
    "A basic chat application with real-time messaging via pub/sub, message history, user presence, and file sharing",
    "A minimal e-commerce flow with product database, shopping cart, basic checkout, and order confirmation emails",
    "A quick survey tool with question builder, response database, real-time analytics, and automated result exports",
  ],
  other: [
    "A todo app with user authentication, real-time sync via pub/sub, task database, and automated deadline reminders",
    "An API service with PostgreSQL database, authentication, automated backups, and real-time data validation",
    "A URL shortener with click tracking, analytics dashboard, custom domains, and automated spam detection",
    "A file converter with upload storage, background processing via cron jobs, and automated completion notifications",
  ],
};

export default function GenerateApp() {
  const [prompt, setPrompt] = useState("");
  const [useCase, setUseCase] = useState("personal");
  const [currentExampleIndex, setCurrentExampleIndex] = useState(0);

  // Don't auto-populate prompt - let user start fresh

  async function handleSubmit(values: FormValues) {
    if (!values.prompt.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Missing Description",
        message: "Please describe what you want to build",
      });
      return;
    }

    // Build context-rich prompt based on use case
    const useCaseContext = getUseCaseContext(values.useCase);
    const contextualPrompt = `${useCaseContext}${values.prompt.trim()}`;
    const encodedPrompt = encodeURIComponent(contextualPrompt);
    const leapUrl = `https://leap.new/?build=${encodedPrompt}`;

    try {
      await open(leapUrl);
      await showToast({
        style: Toast.Style.Success,
        title: "Launching leap.new",
        message: "Generating your app...",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Launch",
        message: "Could not open leap.new",
      });
    }
  }

  function getUseCaseContext(useCase: string): string {
    const contexts = {
      personal: "Build a personal application for individual use: ",
      internal: "Create an internal business tool for team productivity: ",
      customer: "Develop a customer-facing product or website: ",
      saas: "Build a SaaS application with subscription features: ",
      marketplace: "Create a marketplace or platform connecting users: ",
      content: "Build a content or media website: ",
      prototype: "Create a quick prototype or MVP to test the concept: ",
      other: "",
    };
    return contexts[useCase as keyof typeof contexts] || "";
  }

  function handleExampleSelect(examplePrompt: string) {
    setPrompt(examplePrompt);
  }

  function getAllExamples() {
    return Object.values(EXAMPLE_PROMPTS_BY_USE_CASE).flat();
  }

  function surpriseMe() {
    const limitedExamples = getAllExamples().slice(0, 3);
    const nextExample = limitedExamples[currentExampleIndex];
    setPrompt(nextExample);
    setCurrentExampleIndex((prev) => (prev + 1) % limitedExamples.length);
  }

  function handleUseCaseChange(newUseCase: string) {
    setUseCase(newUseCase);
    // Don't auto-change the prompt when use case changes
  }

  return (
    <Form
      navigationTitle="Generate App with leap.new"
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Generate">
            <Action.SubmitForm title="Generate App" icon={Icon.Rocket} onSubmit={handleSubmit} />
            <Action
              title="Surprise Me"
              icon={Icon.Stars}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={surpriseMe}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Examples">
            {getAllExamples()
              .slice(0, 3)
              .map((example, index) => (
                <Action
                  key={index}
                  /* eslint-disable-next-line @raycast/prefer-title-case */
                  title={`"${example.slice(0, 50)}..."`}
                  icon={Icon.LightBulb}
                  onAction={() => handleExampleSelect(example)}
                />
              ))}
          </ActionPanel.Section>

          <ActionPanel.Section title="Links">
            <Action title="Open Leap.new" icon={Icon.Globe} onAction={() => open("https://leap.new")} />
            <Action
              title="View Documentation"
              icon={Icon.Book}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={() => open("https://docs.leap.new")}
            />
            <Action title="View Examples" icon={Icon.Eye} onAction={() => open("https://leap.new/examples")} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="useCase"
        title="Use Case"
        value={useCase}
        onChange={handleUseCaseChange}
        info="What type of application are you building? This helps leap.new understand the context and requirements."
      >
        {USE_CASES.map((useCaseItem) => (
          <Form.Dropdown.Item
            key={useCaseItem.value}
            value={useCaseItem.value}
            title={useCaseItem.title}
            icon={useCaseItem.icon}
          />
        ))}
      </Form.Dropdown>

      <Form.Separator />

      <Form.TextArea
        id="prompt"
        title="App Description"
        placeholder="Describe your app idea in detail..."
        value={prompt}
        onChange={setPrompt}
        info="⌘R for random idea  •  ⌘K for examples  •  ⌘D for docs"
      />

      <Form.Separator />

      <Form.Description
        title="About Leap"
        text="Leap generates production-ready applications that deploy to AWS/GCP with real infrastructure. Unlike prototyping tools, you get working databases, authentication, file storage, real-time features, and background jobs."
      />
    </Form>
  );
}
