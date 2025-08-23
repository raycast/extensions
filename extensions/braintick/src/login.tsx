import { Action, ActionPanel, Detail, Form, Icon, LocalStorage, Toast, popToRoot, showToast } from "@raycast/api";
import { useState } from "react";
import { authenticate } from "./lib/auth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  async function handleSubmit() {
    if (!email || !password) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Please fill in all fields",
      });
      return;
    }

    setIsLoading(true);

    try {
      const result = await authenticate(email, password);

      if (result.success) {
        await LocalStorage.setItem("auth-token", result.token);
        await LocalStorage.setItem("user-email", email);

        await showToast({
          style: Toast.Style.Success,
          title: "Welcome to Braintick! 🎉",
          message: "Successfully logged in",
        });

        await popToRoot();
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Authentication Failed",
          message: result.error || "Invalid credentials",
        });
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Connection Error",
        message: error instanceof Error ? error.message : "Failed to authenticate",
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (!showForm) {
    return (
      <Detail
        markdown={`
# 🧠 Braintick

### Your Productivity Companion

Welcome to **Braintick** - the intelligent task management and time tracking solution that helps you stay organized and productive.

---

## ✨ What you can do with Braintick:

🎯 **Smart Task Management**  
Create, organize, and track tasks with priorities, due dates, and project organization

📊 **Insightful Dashboard**  
Get a comprehensive overview of your productivity with real-time statistics

⏱️ **Time Tracking**  
Track time spent on projects and tasks with detailed reporting

📁 **Project Organization**  
Color-code and organize your work into projects for better focus

🔄 **Huly Integration**  
Seamlessly sync with Huly for enhanced project management

---

## 🚀 Get Started

Ready to boost your productivity? Sign in to your Braintick account and start managing your tasks like a pro!

*New to Braintick? Create your account at your Braintick server.*

---

**Powered by Samarpit Inc.** • *Provided for free access*
        `}
        actions={
          <ActionPanel>
            <Action title="Sign in to Braintick" icon={Icon.Person} onAction={() => setShowForm(true)} />
            <Action.OpenInBrowser title="Need Help" url="https://docs.braintick.com" icon={Icon.QuestionMark} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Sign In to Braintick"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Sign in" icon={Icon.LogIn} onSubmit={handleSubmit} />
          <Action
            title="Back to Welcome"
            icon={Icon.ArrowLeft}
            onAction={() => setShowForm(false)}
            shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="🧠 Sign in to your Braintick account to access your tasks, projects, and time tracking." />

      <Form.Separator />

      <Form.TextField
        id="email"
        title="Email Address"
        placeholder="your@email.com"
        value={email}
        onChange={setEmail}
        info="Enter the email address associated with your Braintick account"
      />

      <Form.PasswordField
        id="password"
        title="Password"
        placeholder="Enter your password"
        value={password}
        onChange={setPassword}
        info="Your secure Braintick account password"
      />

      <Form.Separator />

      <Form.Description text="🔒 Your credentials are securely encrypted and stored locally on your device." />

      <Form.Description text="💡 Tip: Use ⌘+Enter to quickly sign in, or ⌘+← to go back." />
    </Form>
  );
}
