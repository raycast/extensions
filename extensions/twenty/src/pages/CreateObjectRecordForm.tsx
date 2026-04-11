import { DataModelWithFields } from "../services/zod/schema/recordFieldSchema";
import { selectPrimaryField } from "../helper/selectPrimaryField";
import CreateObjectRecordForm from "../create-object-record-form";

export default function OpenCreateObjectRecordForm({
  objectRecordMetadata,
}: {
  objectRecordMetadata: DataModelWithFields;
}) {
  const primary = selectPrimaryField(objectRecordMetadata);

  const rest = objectRecordMetadata.fields.filter((field) => field.id !== primary.id);

  return <CreateObjectRecordForm objectRecordMetadata={objectRecordMetadata} fields={{ rest, primary }} />;
}
