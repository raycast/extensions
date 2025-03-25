import { DataModelWithFields } from "../services/zod/schema/recordFieldSchema";
import CreateObjectRecordForm from "../create-object-record-form";

export default function OpenCreateObjectRecordForm({
  objectRecordMetadata,
}: {
  objectRecordMetadata: DataModelWithFields;
}) {
  // Reason: Currently we don't have a way to know if its which field is primary, we can fix this hard coding.
  // Something like a flag field (isPrimary) or maybe a TITLE type for primary in API or position
  const isPrimaryFieldTitle =
    objectRecordMetadata.labelPlural === "Tasks" || objectRecordMetadata.labelPlural === "Notes";

  const primary = objectRecordMetadata.fields.find((field) =>
    isPrimaryFieldTitle ? field.name === "title" : field.name === "name",
  )!;

  const rest = objectRecordMetadata.fields.filter((field) => field.id !== primary.id);

  return <CreateObjectRecordForm objectRecordMetadata={objectRecordMetadata} fields={{ rest, primary }} />;
}
