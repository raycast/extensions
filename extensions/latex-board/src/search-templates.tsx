import { Action, ActionPanel, Grid, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { SEARCH_GRID_COLUMNS } from "./core/constants";
import { templates } from "./core/templates";
import { useState } from "react";
import { useLatex } from "./libs/use-latex";
import { EquationObj } from "./libs/use-equation";
import CreateEquation from "./create-equation";

export default function Command() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const { displayLatexURL, downloadLatexImage } = useLatex();

  const { push } = useNavigation();

  const filteredTemplates = Object.entries(templates).filter(
    ([cat]) => selectedCategory === "all" || cat === selectedCategory,
  );

  const handleCreate = async (title: string, latex: string) => {
    const equation: EquationObj = {
      id: "",
      title,
      latex,
      tags: [],
      favorite: false,
    };

    push(<CreateEquation equation={equation} />);
  };

  const handleExport = async (title: string, latex: string) => {
    try {
      await downloadLatexImage(title, latex);

      showToast({
        style: Toast.Style.Success,
        title: "Equation Image Exported",
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Export Equation Image",
        message: String(error),
      });
    }
  };

  return (
    <Grid
      inset={Grid.Inset.Small}
      columns={SEARCH_GRID_COLUMNS}
      searchBarPlaceholder="Search LaTeX templates"
      searchBarAccessory={
        <Grid.Dropdown tooltip="Filter by Category" onChange={(v) => setSelectedCategory(v)} value={selectedCategory}>
          <Grid.Dropdown.Item key="all" title="All Categories" value="all" />
          {Object.keys(templates).map((cat) => (
            <Grid.Dropdown.Item key={cat} title={cat} value={cat} />
          ))}
        </Grid.Dropdown>
      }
    >
      {filteredTemplates.map(([category, equations]) => (
        <Grid.Section key={category} title={category}>
          {Object.entries(equations).map(([title, latex]) => (
            <Grid.Item
              key={title}
              content={displayLatexURL(latex)}
              title={title}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy to Clipboard" content={latex} />
                  <Action
                    icon={Icon.PlusCircle}
                    title="Create New Equation from Template"
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                    onAction={() => handleCreate(title, latex)}
                  />
                  <Action
                    icon={Icon.Download}
                    title="Export Image"
                    shortcut={{ modifiers: ["cmd"], key: "s" }}
                    onAction={() => handleExport(title, latex)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </Grid.Section>
      ))}
    </Grid>
  );
}
