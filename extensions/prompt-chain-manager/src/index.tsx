// This file often acts as the entry point for the *first* command listed
// in package.json, or Raycast links commands directly to files named
// src/<commandName>.tsx.
// Ensure this exports the correct component for your main command.

// Assuming 'managePromptChain' is your main command and its component
// is defined in './managePromptChain.tsx'
import ManagePromptChain from "./managePromptChain";

// Export the component as the default export for this command entry point
export default ManagePromptChain;

// If you had other commands defined in separate files like:
// import AddClipboardComponent from "./addClipboardToChain";
// import AddTemplateComponent from "./addTemplateToChain";
// Raycast's build process typically handles linking those commands
// in package.json to their respective files/exports automatically.
