import { Detail } from "@raycast/api";
import React from "react";

export default function DynamicSnippetHelp() {
  return (
    <Detail
      navigationTitle="About Dynamic Snippets "
      markdown={`# 🪄 Dynamic Snippets

With dynamic snippets, you can define placeholders for variables in your snippet, then replace them with different values each time you use the snippet.

Use of this feature requires some knowledge of how the underlying XML used by Claris works, but if you're new to that it can be easily learned through some basic trial-and-error.

## How to use
1. Add placeholders to any snippet's underlying XML using the **Edit Snippet XML** command. We suggest the \`{{mergeVariableName}}\` syntax.
2. Define the dynamic fields that match the placeholders you defined in step 1. You can do this by using the **Edit Dynamic Fields** command.
3. When you use the snippet, you'll be prompted to enter values for each dynamic field. These values will be used to replace the placeholders in the snippet's underlying XML.

## Tips
- You can add placeholders in multiple places in your XML. Each instance will be replaced with the same value.  
- Specifcy a default value for each dynamic field to pre-fill the form when it loads.  
- Use the **Dropdown** field type when you want a list of searchable, predefined options when filling out the form.
    `}
    />
  );
}
