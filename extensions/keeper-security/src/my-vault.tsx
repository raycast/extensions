import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { getRecordById, getServerUrl, listAllRecords } from "./api";
import { ProcessedRecord, ListRecord, RecordTypes, DetailedRecordResponse } from "./lib/types";
import { ERROR_MESSAGES, IN_PROGRESS_MESSAGES } from "./lib/constants";
import { camelCaseToWords, getRecordaTypeIcon, isCanceledError, RECORD_TYPE_TO_TITLE_MAP } from "./lib/helpers";
import { DEFAULT_CATEGORY, RecordTypesDropdown } from "./components/RecordTypesDropdown";
import { useCachedState } from "@raycast/utils";
import MyVaultActionPanel from "./components/MyVaultActionPanel";
import { Error } from "./components/Error";
import { MyVaultRecordDetails } from "./components/MyVaultRecordDetails";

const RECORD_DETAILS_INITIAL_STATE = {
  isLoading: false,
  isShowingDetail: false,
  recordDetails: null as DetailedRecordResponse | null,
};

export default function MyVault() {
  const [recordType, setRecordType] = useCachedState<string>("selected_record_type", DEFAULT_CATEGORY);
  const [originalRecords, setOriginalRecords] = useState<ProcessedRecord[]>([]);
  const [records, setRecords] = useState<ProcessedRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown | null>(null);
  const [recordDetails, setRecordDetails] = useState(RECORD_DETAILS_INITIAL_STATE);
  const [customerServerUrl, setCustomerServerUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchAllRecords();
    fetchServerUrl();
  }, []);

  useEffect(() => {
    if (!originalRecords.length) return;

    if (recordType === DEFAULT_CATEGORY) {
      setRecords(originalRecords);
    } else {
      setRecords(originalRecords.filter((record) => record.type === recordType));
    }

    setIsLoading(false);
  }, [recordType, originalRecords]);

  const fetchServerUrl = async () => {
    try {
      setError(null);

      const response = await getServerUrl();
      const { message: serverUrl } = response.data;
      if (!serverUrl) {
        setCustomerServerUrl(null);
        showToast({
          style: Toast.Style.Failure,
          title: ERROR_MESSAGES.FETCH_SERVER_URL,
        });
        return;
      }
      setCustomerServerUrl(serverUrl);
    } catch (error) {
      if (isCanceledError(error as Error)) {
        return;
      }

      setCustomerServerUrl(null);
      setError(error);
    }
  };

  const fetchAllRecords = async () => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: IN_PROGRESS_MESSAGES.FETCHING_RECORDS_TITLE,
    });
    try {
      // Reset error and loading state
      setError(null);
      setIsLoading(true);

      const response = await listAllRecords();
      const data = response.data;
      const { data: fetchedRecords } = data;

      const processedRecords: ProcessedRecord[] = [];

      if (fetchedRecords?.message?.includes("No records")) {
        toast.hide();
        return processedRecords;
      }

      for (const record of fetchedRecords as ListRecord[]) {
        const temp: ProcessedRecord = {
          recordUid: record.record_uid,
          title: record.title,
          type: record.type,
          description: record.description ?? "",
        };

        processedRecords.push(temp);
      }

      setOriginalRecords(processedRecords);
      toast.hide();
    } catch (error) {
      if (isCanceledError(error as Error)) {
        return;
      }

      setRecords([]);
      setOriginalRecords([]);

      toast.hide();

      setError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecordTypeChange = (newRecordType: string) => {
    if (recordType !== newRecordType) {
      setRecordType(newRecordType);
    }
  };

  const fetchRecordDetails = async (recordUid: string) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: IN_PROGRESS_MESSAGES.FETCHING_RECORD_DETAILS_TITLE,
    });

    try {
      const response = await getRecordById(recordUid);
      const { data: recordDetails } = response.data;

      if (!recordDetails) {
        toast.style = Toast.Style.Failure;
        toast.title = ERROR_MESSAGES.FETCH_RECORD_DETAILS;

        toast.hide();
        return;
      }

      setRecordDetails((prev) => ({
        ...prev,
        isLoading: false,
        isShowingDetail: true,
        recordDetails: recordDetails as DetailedRecordResponse,
      }));

      toast.hide();
    } catch (error) {
      if (isCanceledError(error as Error)) {
        return;
      }

      toast.hide();

      setRecordDetails(RECORD_DETAILS_INITIAL_STATE);
      setError(error);
    }
  };

  if (error) {
    return <Error error={error} />;
  }

  return (
    <List
      isLoading={isLoading || recordDetails.isLoading}
      searchBarPlaceholder="Search your records"
      searchBarAccessory={<RecordTypesDropdown onRecordTypeChange={handleRecordTypeChange} />}
      isShowingDetail={recordDetails.isShowingDetail}
      onSelectionChange={() => setRecordDetails(RECORD_DETAILS_INITIAL_STATE)}
    >
      <List.EmptyView
        title="No records found"
        icon="keeper-logo-round.ico"
        description="Any records you have added in Keeper Vault will be displayed here."
      />

      <List.Section title="Records" subtitle={`${records.length}`}>
        {records.length > 0 &&
          records.map((record: ProcessedRecord) => (
            <List.Item
              id={record.recordUid}
              key={record.recordUid}
              title={record.title}
              subtitle={record.description}
              accessories={[
                {
                  tag: {
                    value: RECORD_TYPE_TO_TITLE_MAP[record.type as RecordTypes] ?? camelCaseToWords(record.type),
                    color: Color.Yellow,
                  },
                },
              ]}
              icon={{
                source: getRecordaTypeIcon(record.type as RecordTypes),
                tintColor: Color.Yellow,
                tooltip: record.type,
              }}
              actions={
                <ActionPanel>
                  {!recordDetails.isLoading && !recordDetails.isShowingDetail && (
                    <Action
                      title="Show Details"
                      icon={Icon.Sidebar}
                      onAction={() => {
                        setRecordDetails((prev) => ({ ...prev, isLoading: true }));
                        fetchRecordDetails(record.recordUid);
                      }}
                    />
                  )}
                  <MyVaultActionPanel
                    record={record}
                    fetchAllRecords={fetchAllRecords}
                    setError={setError}
                    customerServerUrl={customerServerUrl}
                  />
                </ActionPanel>
              }
              detail={
                recordDetails.isShowingDetail && recordDetails.recordDetails ? (
                  <MyVaultRecordDetails recordDetails={recordDetails.recordDetails} />
                ) : null
              }
            />
          ))}
      </List.Section>
    </List>
  );
}
