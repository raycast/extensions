# Dify AI Extension for Raycast

Seamlessly integrate all Dify AI applications into Raycast with a single click, enabling instant access and execution within Raycast.

## Features

- Seamless integration with Dify AI applications
- Easy management of all Dify applications
- Direct interaction with AI applications within Raycast
- Support for conversation continuity and user identification

## Commands

This extension provides several commands to interact with Dify AI applications. Below is a detailed guide for each command.

### Add Dify App

Add a new Dify application to your Raycast extension.

| Parameter         | Required | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ----------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Application Name  | Yes      | A unique name to identify this Dify application in Raycast                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Endpoint          | Yes      | The API URL for your Dify application (default: https://api.dify.ai/v1)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| API Key           | Yes      | The API key obtained from Dify                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Input Parameters  | No       | Comma-separated list of input parameter names required by your Dify application                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Application Type  | Yes      | Type of Dify application: Chatflow/Agent, Workflow, or Text Generator                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Assistant Name    | No       | Custom name for the assistant in responses (will appear in the history, for example: Assistant_name: Hello World!)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Response Mode     | Yes      | Choose between blocking (default) or streaming response mode                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Wait for Response | Yes      | Whether to wait for the complete response (Yes) or just check API call success (No) (By default, it is Wait Mode, meaning that when initiating an API call using @Dify, it waits for the return result, or it only cares whether the API request was successfully sent.)                                                                                                                                                                                                                                                                                                                                      |
| Conversation Type | Yes      | Choose between Continuous (maintain conversation history) or Single Call (It means that when you use @Dify, it tracks the Conversation_id. By default, it is Continuous, meaning that it will store the conversation_id of the corresponding Dify App used last time (even if Raycast is closed and reopened next time), unless the user explicitly states to start a new conversation or change the topic. In this case, the AI will automatically start a new conversation session. Of course, since the Raycast call allows viewing the conversation_id, you can also manually specify the conversation id.) |
| Description       | No       | Optional description of the application (It is recommended that you briefly describe the purpose of this app in English, as this will help Raycast determine which app to call when using @Dify, thereby improving accuracy.)                                                                                                                                                                                                                                                                                                                                                                                   |

### Ask Dify

Interact with a Dify application by sending queries and receiving responses.

| Parameter        | Required | Description                                                                                                            |
| ---------------- | -------- | ---------------------------------------------------------------------------------------------------------------------- |
| Input            | Yes      | Your query or message to send to the Dify application                                                                  |
| Application      | Yes      | Select from your previously added Dify applications                                                                    |
| Input Parameters | No       | Provide values for any input parameters required by the application (JSON format, named parameters, or simple values.) |
| User ID          | No       | Custom identifier for the user (helps with conversation tracking, defaults to Raycast_{systemName})                    |

### List Dify Apps

View, edit, or delete your configured Dify applications.

| Action       | Description                                                |
| ------------ | ---------------------------------------------------------- |
| View Details | See complete configuration details for an application      |
| Edit         | Modify any application settings                            |
| Delete       | Remove an application from your configuration              |
| Ask          | Quickly start a conversation with the selected application |

### Dify History

View and manage your conversation history with Dify applications.

| Action                | Description                                              |
| --------------------- | -------------------------------------------------------- |
| Continue Conversation | Resume a previous conversation thread                    |
| View Details          | See the complete conversation history                    |
| Edit Conversation     | Modify the conversation content (for reference purposes) |
| Delete Conversation   | Remove a conversation from history                       |
| Clear All History     | Delete all conversation history                          |

### Input Parameters Format

When providing input parameters, you can use any of these formats:

1. **JSON format**: `{"var1": "value1", "var2": "value2"}`
2. **Named parameters**: `var1=value1, var2=value2`
3. **Simple values**: `value1, value2` (values will be assigned in order)

## AI Tools Usage Examples

The Dify extension provides powerful AI capabilities through Raycast's AI command system. Here are some examples of how to use these tools:

1. **Research with DeepResearch App**:

   ```
   @Dify, please use the DeepResearch App to complete a research task related to quantum computing advancements in 2024.
   ```
2. **Combining Notes with Research**:

   ```
   @raycast-notes, please retrieve my notes on renewable energy technologies, this is background information. Please send this completely to @Dify, forwarding it to the DeepResearch App. Although my App Detail is set to Waiting mode, please use Non-Waiting mode this time.
   ```
3. **Task Management with Reminders**:

   ```
   @apple-reminders, please check all tasks in the "School" List, @Dify select appropriate Apps to complete each of these tasks.
   ```
4. **GitHub Repository Analysis**:

   ```
   @Dify, please use the Github Repo Explainer App, start a new conversation, with inputs url set to https://github.com/cyclotruc/gitingest
   ```
5. **Listen to Music and Learn Technical Terms**:

   ```
   @spotify-player, first play Aimyon's Marigold, then @Dify help me interpret all the technical terminology in the current tab window. (Before this, you need to open the Raycast AI chat window, then use + to add the Add Focused Browser Tab option to get the tab content)
   ```
   
6. **Extension Development**:

   ```
   @Dify, please use Raycast Extension Agent to help me create a pomodoro timer command that displays a dynamic pomodoro timer component in detail view, defaulting to 25 minutes, using interesting symbols for the progress bar. The panel should allow pausing, resetting, and entering rest sessions. After writing it, use @shell to save it to the designated folder on my desktop.
   ```

## Where can I get Dify DSL

1. **Social Media**: Search on X (formerly Twitter) for shared DSL documents. You can find many resources shared by other users in various languages including English, Chinese, and Japanese.
2. **Dify.AI Explorer**: Add ready-to-use official workflows in the Dify.AI Explorer. For example, you can find workflows like DeepResearch that are officially released and available for immediate use.
3. **GitHub Resources**: Visit [Awesome-Dify-Workflow](https://github.com/svcvit/Awesome-Dify-Workflow) for a collection of reference workflows and examples.
4. **Learning Resources**: Check out [dify101.com](https://dify101.com) for additional learning materials and guides.

DSL workflows are best used for creating highly personalized and customized design processes for yourself or for your company.

We encourage users to develop their own workflows. For maximum flexibility, we recommend using the **Chatflow** type in Dify.AI, as it offers the greatest versatility for custom implementations.

Additionally, the Plugin System in Dify.AI is continuously evolving and improving. You can find interesting Nodes for developing Dify applications in the Plugin Marketplace, and then add them to your local environment using the "Add Dify App" command in Raycast.

## License

MIT License

## Contributor

[@LogicOber](https://github.com/LogicOber)
[@Lyson Ober](https://x.com/lyson_ober)
