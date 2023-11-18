import { List } from "@raycast/api";
import { documentStore } from "../context";
import { useRecords } from "../hooks";
import { EncryptedPasswordForm } from "../views";
import { Record, NoRecords } from "../components";

export const Records: React.FC = () => {
  const { data, isLoading, revalidate } = useRecords();
  const { ref, password } = documentStore.getState();
  const encryptedWithNoPassword = ref && ref.isEncrypted && !password;

  if (encryptedWithNoPassword) return <EncryptedPasswordForm documentName={ref.name} />;

  if (!data) return <List isLoading={true} />;

  const { document, records } = data;
  const showEmptyState = records.length === 0;

  return (
    <List
      isShowingDetail={!showEmptyState}
      isLoading={isLoading}
      navigationTitle={`RayPass - ${document.name}`}
      searchBarPlaceholder="Search Records"
    >
      {showEmptyState ? (
        <NoRecords documentName={document?.name} revalidateRecords={revalidate} />
      ) : (
        <List.Section title={`Records (${records.length})`}>
          {records.map((record, index) => (
            <Record key={index} documentName={document.name} {...record} revalidateRecords={revalidate} />
          ))}
        </List.Section>
      )}
    </List>
  );
};
