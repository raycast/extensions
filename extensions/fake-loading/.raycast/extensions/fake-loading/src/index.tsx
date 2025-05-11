import { List, ActionPanel, Action } from "@raycast/api";
import { useState, useEffect } from "react";
import React from "react";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  
  // Simulate loading delay and then set isLoading to false
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Example list items
  const items = [
    { id: "1", icon: "⚡️", title: "Lightning" },
    { id: "2", icon: "⭐️", title: "Star" },
    { id: "3", icon: "💻", title: "Computer" },
    { id: "4", icon: "🔄", title: "Loading" }
  ];
  
  return (
    <List isLoading={isLoading}>
      {items.map((item) => (
        <List.Item
          key={item.id}
          icon={item.icon}
          title={item.title}
          actions={
            <ActionPanel>
              <Action title="Select" onAction={() => console.log(`Selected ${item.title}`)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

// Our own implementation of showFailureToast
async function showFailureToast(error: unknown, options?: { title?: string }) {
  const toast = await showToast({
    style: Toast.Style.Failure,
    title: options?.title || "Something went wrong",
    message: error instanceof Error ? error.message : String(error),
  });
  
  return toast;
} 