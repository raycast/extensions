import { Grid } from "@raycast/api";
import { useMailerSendPaginated } from "./mailersend";
import { Template } from "./interfaces";

export default function Templates() {
  const { isLoading, data: templates } = useMailerSendPaginated<Template>("templates");

  return (
    <Grid isLoading={isLoading} columns={4}>
      {templates.map((template) => (
        <Grid.Item
          key={template.id}
          title={template.name}
          subtitle={`ID: ${template.id}`}
          content={template.image_path}
        />
      ))}
    </Grid>
  );
}
