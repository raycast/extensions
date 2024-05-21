// components/FeedbackForm.tsx

import { Form, Action, ActionPanel } from "@raycast/api";
import React, { useState } from "react";

const FeedbackForm = ({ onClose }: { onClose: () => void }) => {
  const [feedback, setFeedback] = useState("");

  const handleSubmit = () => {
    // Logic to submit feedback
    // For example, send feedback to a server
    console.log("Feedback submitted:", feedback);
    // Call the onClose function passed from the parent component
    onClose();
  };

  return (
    <Form>
      <Form.Description text="Have something to share? I'd love to hear what you have to say! 😁 Fill out the form and I'll get back to you." />
      <Form.TextArea
        id="feedback"
        title="Message"
        placeholder="Enter your feedback here..."
        value={feedback}
        onChange={setFeedback}
      />
      <Form.TextField
        id="email"
        title="Email"
        placeholder="example@feedback.com"
      />
      <Form.Checkbox id="remember" label="Remember my email" />
      <ActionPanel>
        <Action.SubmitForm title="Submit Feedback" onSubmit={handleSubmit} />
      </ActionPanel>
    </Form>
  );
};

export default FeedbackForm;
