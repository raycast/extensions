import {
  ActionPanel,
  Form,
  Action,
  showToast,
  useNavigation,
  Toast,
} from "@raycast/api";
import React, { useState } from "react";
import Graph from "./components/Graph";
import FeedbackForm from "./components/FeedbackForm";

export default function Command() {
  const [expression, setExpression] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false); // Track whether to display the feedback form
  const { push } = useNavigation();

  const handleSubmit = () => {
    if (expression.trim() === "") {
      showToast({
        style: Toast.Style.Failure,
        title: "Validation Error",
        message: "Expression cannot be empty",
      });
      return;
    }
    // If validation passes, navigate to the Graph component
    push(
      <Graph
        expression={expression}
        history={history}
        setHistory={setHistory}
      />,
    );
  };

  // const handleFeedback = () => {
  //   // Set the state to display the feedback form
  //   setShowFeedbackForm(true);
  // };

  const handleCloseFeedbackForm = () => {
    // Set the state to hide the feedback form
    setShowFeedbackForm(false);
  };

  return (
    <>
      {!showFeedbackForm ? (
        <Form
          actions={
            <ActionPanel>
              <Action.SubmitForm title="Plot Graph" onSubmit={handleSubmit} />
              {/* <Action title="Provide Feedback" onAction={handleFeedback} /> */}
            </ActionPanel>
          }
        >
          <Form.TextField
            id="expression"
            placeholder="Enter an equation or expression (e.g., sin(x))"
            value={expression}
            onChange={setExpression}
          />
        </Form>
      ) : (
        <FeedbackForm onClose={handleCloseFeedbackForm} />
      )}
    </>
  );
}
