import { List } from "@raycast/api";
import { isTrueStr } from "../../lib/common/types";
import { Command, StoreCommand, isCommand, isStoreCommand } from "../../lib/commands/types";
import { NumberConfigField, BooleanConfigField, StringConfigField } from "../../lib/commands/config/types";

export default function CommandListDetail(props: { command: Command | StoreCommand }) {
  const { command } = props;

  return (
    <List.Item.Detail
      markdown={`# ${command.name}

${isCommand(command) ? (command.installedFromStore ? `_Installed From **PromptLab Store**_<br/>` : ``) : ``}

Version: ${command.version || "1.0.0"}

${command.author?.length && command.author !== "None" ? `Author: ${command.author}` : ``}

${command.website?.length && command.website !== "None" ? `Website: [${command.website}](${command.website})` : ``}

## Description
${command.description || "None"}

## Prompt
\`\`\`
${command.prompt}
\`\`\`

## Action Script
${
  command.actionScript?.length
    ? `\`\`\`${command.scriptKind}
${command.actionScript}
\`\`\``
    : `\`\`\`
None
\`\`\``
}

${
  command.actionScript?.length && command.actionScript != "None"
    ? `Script Kind: ${command.scriptKind == undefined ? "AppleScript" : command.scriptKind}`
    : ``
}

## Requirements

${
  command.requirements?.length
    ? `\`\`\`
${command.requirements}
\`\`\``
    : `\`\`\`
None
\`\`\``
}

## Categor${command.categories?.length && command.categories.length > 1 ? "ies" : "y"}

${
  isCommand(command)
    ? command.categories || []
    : (command.categories || "")
        .split(", ")
        .sort((a, b) => (a > b ? 1 : -1))
        .join(", ") || "Other"
}

${
  isStoreCommand(command) && command.exampleOutput && command.exampleOutput !== "None"
    ? `## Example Output
  ![Example of the command's output](${command.exampleOutput})
  `
    : ``
}

## Options

| Option | Value |
| --- | --- |
| Output View | ${(command.outputKind?.at(0)?.toUpperCase() || "") + (command.outputKind?.substring(1) || "")} |
| Show Response View | ${isTrueStr(command.showResponse) ? "Yes" : "No"} |
| Speak Response? | ${isTrueStr(command.speakResponse) ? "Yes" : "No"} |
| Speech Input? | ${isTrueStr(command.useSpeech) ? "Yes" : "No"} |
| Minimum File Count | ${command.minNumFiles} |
| Accepted File Extensions | ${
        command.minNumFiles == "0"
          ? "N/A"
          : command.acceptedFileExtensions?.length && command.acceptedFileExtensions !== "None"
            ? command.acceptedFileExtensions
            : "Any"
      } |
| Creativity | ${command.temperature == undefined || command.temperature == "" ? "1.0" : command.temperature} |
| Record Runs? | ${isTrueStr(command.recordRuns) ? "Yes" : "No"} |
| Use File Metadata? | ${isTrueStr(command.useMetadata) ? "Yes" : "No"} |
| Use Sound Classification? | ${isTrueStr(command.useSoundClassification) ? "Yes" : "No"} |
| Use Subject Classification? | ${isTrueStr(command.useSubjectClassification) ? "Yes" : "No"} |
| Use Audio Transcription? | ${isTrueStr(command.useAudioDetails) ? "Yes" : "No"} |
| Use Barcode Detection? | ${isTrueStr(command.useBarcodeDetection) ? "Yes" : "No"} |
| Use Face Detection? | ${isTrueStr(command.useFaceDetection) ? "Yes" : "No"} |
| Use Horizon Detection? | ${isTrueStr(command.useHorizonDetection) ? "Yes" : "No"} |
| Use Rectangle Detection? | ${isTrueStr(command.useRectangleDetection) ? "Yes" : "No"} |
| Use Saliency Analysis? | ${isTrueStr(command.useSaliencyAnalysis) ? "Yes" : "No"} |
${isCommand(command) ? `| Model | ${command.model || "Not Specified"} |` : ``}

${
  command.setupConfig && command.setupConfig !== "None"
    ? `## Setup Config

| Field | Description | Value |
| --- | --- | --- |
${(isCommand(command) ? command.setupConfig : JSON.parse(command.setupConfig)).fields
  .map(
    (field: NumberConfigField | BooleanConfigField | StringConfigField) =>
      `| ${field.name} | ${
        field.description == undefined || field.description.trim().length == 0 ? "None" : field.description
      } | ${field.value == undefined || field.value.toString().trim().length == 0 ? "None" : field.value} |`,
  )
  .join("\n")}
`
    : ``
}`}
    />
  );
}
