import React from "react";
import { ActionPanel, Action, List } from "@raycast/api";




const u = "https://api.invitation.codes/api/v2/clientCountry"
// Sample static data
const listItems = [
  {
    id: "1",
    title: "First Item",
    subtitle: "This is the first item description",
    icon: "🎯"
  },
  {
    id: "2", 
    title: "Second Item",
    subtitle: "This is the second item description",
    icon: "⭐️"
  },
  {
    id: "3",
    title: "Third Item",
    subtitle: "This is the third item description",
    icon: "🚀"
  }
];

export default function Command() {
  return (
    
    <List searchBarPlaceholder="Search items...">
       
      {listItems.map((item) => (
        <List.Item
          key={item.id}
          icon={item.icon}
          title={item.title}
          subtitle={item.subtitle}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard 
                title="Copy Title"
                content={item.title} 
              />
              <Action.CopyToClipboard 
                title="Copy Subtitle"
                content={item.subtitle} 
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}