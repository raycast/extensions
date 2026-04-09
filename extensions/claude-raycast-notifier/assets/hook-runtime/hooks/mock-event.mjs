const type = process.argv[2] ?? "needs_input";

const event = {
  needs_input: {
    hook_event_name: "Elicitation",
    prompt: "Approve the command in Claude Code",
    options: [
      { value: "approve", label: "Approve" },
      { value: "deny", label: "Deny" },
    ],
    title: "Claude needs your input",
    message: "Approve the command in Claude Code",
  },
  failure: {
    type: "failure",
    title: "Claude hit an error",
    message: "The last command failed",
  },
  done: {
    type: "done",
    title: "Claude finished the task",
    message: "Implementation and checks are complete",
  },
  success: {
    type: "success",
    title: "Claude completed the command",
    message: "The command finished successfully",
  },
  ask_user_question: {
    tool_name: "AskUserQuestion",
    session_id: "mock-session",
    tool_use_id: "mock-tool-use",
    tool_input: {
      prompt: "Choose a deployment target",
      questions: [
        {
          question: "Where should Claude deploy?",
          choices: ["staging", "production"],
        },
      ],
    },
  },
  gemini_ask_user: {
    tool_name: "ask_user",
    session_id: "gemini-session",
    tool_use_id: "gemini-tool-use",
    tool_input: {
      prompt: "Where should Gemini deploy?",
      title: "Deployment Target",
      type: "choice",
      options: [
        {
          value: "staging",
          label: "staging",
          description: "Safer preview environment",
        },
        {
          value: "production",
          label: "production",
          description: "Live user traffic",
        },
      ],
    },
  },
}[type];

if (!event) {
  console.error(`Unknown event type: ${type}`);
  process.exit(1);
}

process.stdout.write(JSON.stringify(event));
