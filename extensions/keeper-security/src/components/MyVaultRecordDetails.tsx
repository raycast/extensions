import React from "react";
import { Color, Icon, List, Clipboard, showToast, Toast } from "@raycast/api";
import { DetailedRecordResponse, RecordField, RecordTypes } from "../lib/types";
import { camelCaseToWords, RECORD_TYPE_TO_TITLE_MAP } from "../lib/helpers";
import { SUCCESS_MESSAGES } from "../lib/constants";

interface MyVaultRecordDetailsProps {
  recordDetails: DetailedRecordResponse;
}

export function MyVaultRecordDetails({ recordDetails }: MyVaultRecordDetailsProps) {
  const isSensitiveField = (fieldType: string) => {
    return [
      "password",
      "passphrase",
      "pin",
      "secret",
      "token",
      "code",
      "otp",
      "privateKey",
      "publicKey",
      "accountNumber",
      "routingNumber",
      "cardSecurityCode",
      "cardNumber",
      "passportNumber",
      "answer",
      "keyPair",
      "identityNumber",
      "passportNumber",
      "trafficEncryptionKey",
    ].some((field) => {
      const regex = new RegExp(field, "i");
      return regex.test(fieldType);
    });
  };

  const isFieldToSkip = (data: string) => {
    return [
      "oneTimeCode",
      "Ref",
      "trafficEncryptionSeed",
      "colorScheme",
      "userRecords",
      "enableFullWindowDrag",
      "enableWallpaper",
      "ignoreCert",
      "recordingIncludeKeys",
      "resizeMethod",
      "allowUrlManipulation",
      "httpCredentialsUid",
      "autofillConfiguration",
      "ignoreInitialSslCert",
      "user_records",
      "adminCredentialUid",
      "configUid",
    ].some((field) => {
      return data.includes(field);
    });
  };

  const processFieldStringValue = (
    fieldType: string,
    fieldValue: string,
  ): { processedDisplayValue: string; processedCopyValue: string } => {
    let displayValue: string;
    let copyValue: string;

    if (isSensitiveField(fieldType)) {
      displayValue = "********";
      copyValue = fieldValue;
    } else {
      displayValue = fieldValue;
      copyValue = fieldValue;
    }

    return { processedDisplayValue: displayValue, processedCopyValue: copyValue };
  };

  const processFieldNumberValue = (
    fieldType: string,
    fieldValue: number,
  ): { processedDisplayValue: string; processedCopyValue: string } => {
    let displayValue: string;
    let copyValue: string;

    // Handle timestamps and other numbers
    if (/date/i.test(fieldType)) {
      // Convert timestamp to readable date
      const formattedValue = new Date(fieldValue).toLocaleDateString();
      displayValue = formattedValue;
      copyValue = formattedValue;
    } else {
      displayValue = fieldValue.toString();
      copyValue = fieldValue.toString();
    }

    return { processedDisplayValue: displayValue, processedCopyValue: copyValue };
  };

  const processNestedValue = (
    value: unknown,
    fieldType: string,
    fieldTitle: string,
    keyPrefix: string = "",
    depth: number = 0,
    isMainField: boolean = false,
  ): React.ReactNode[] => {
    const result: React.ReactNode[] = [];

    // Skip null, undefined, or empty values
    if (value === null || value === undefined) {
      return result;
    }

    // Skip empty strings
    if (typeof value === "string" && value.trim() === "") {
      return result;
    }

    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      // Handle primitive values
      const { processedDisplayValue, processedCopyValue } =
        typeof value === "string"
          ? processFieldStringValue(fieldType, value)
          : typeof value === "number"
            ? processFieldNumberValue(fieldType, value)
            : {
                processedDisplayValue: isSensitiveField(fieldType) ? "********" : String(value),
                processedCopyValue: String(value),
              };

      result.push(
        <List.Item.Detail.Metadata.TagList
          key={`${keyPrefix}-${fieldTitle}-${depth}-${Date.now()}-${Math.random()}`}
          title={fieldTitle}
        >
          <List.Item.Detail.Metadata.TagList.Item
            key={`${keyPrefix}-${fieldTitle}-${depth}-${Date.now()}-${Math.random()}`}
            text={processedDisplayValue}
            onAction={() => {
              Clipboard.copy(processedCopyValue);
              showToast({
                style: Toast.Style.Success,
                title: `${fieldTitle} ${SUCCESS_MESSAGES.COPIED_TO_CLIPBOARD}`,
              });
            }}
          />
        </List.Item.Detail.Metadata.TagList>,
      );
    } else if (Array.isArray(value)) {
      // Handle arrays
      if (value.length === 0) {
        return result; // Skip empty arrays
      }

      // Filter out empty/null/undefined values from array
      const filteredArray = value.filter(
        (item) => item !== null && item !== undefined && (typeof item !== "string" || item.trim() !== ""),
      );

      // If all items were filtered out, skip this array
      if (filteredArray.length === 0) {
        return result;
      }

      if (
        filteredArray.every((item) => typeof item === "string" || typeof item === "number" || typeof item === "boolean")
      ) {
        const arrayValue = filteredArray.map((item) => String(item)).join(", ");

        result.push(
          <List.Item.Detail.Metadata.TagList
            key={`${keyPrefix}-${fieldTitle}-${depth}-${Date.now()}-${Math.random()}`}
            title={fieldTitle}
          >
            <List.Item.Detail.Metadata.TagList.Item
              key={`${keyPrefix}-${fieldTitle}-${depth}-${Date.now()}-${Math.random()}`}
              text={arrayValue}
              onAction={() => {
                Clipboard.copy(arrayValue);
                showToast({
                  style: Toast.Style.Success,
                  title: `${fieldTitle} ${SUCCESS_MESSAGES.COPIED_TO_CLIPBOARD}`,
                });
              }}
            />
          </List.Item.Detail.Metadata.TagList>,
        );
      } else {
        filteredArray.forEach((item, index) => {
          const itemTitle = `${fieldTitle}[${index}]`;
          const nestedResults = processNestedValue(item, fieldType, itemTitle, keyPrefix, depth + 1, false);
          result.push(...nestedResults);
        });
      }
    } else if (typeof value === "object") {
      // Handle objects recursively
      const objectEntries = Object.entries(value);

      // Filter out entries with empty/null/undefined values
      const filteredEntries = objectEntries.filter(([key, val]) => {
        if (isFieldToSkip(key)) return false;
        if (val === null || val === undefined) return false;
        if (typeof val === "string" && val.trim() === "") return false;
        if (Array.isArray(val) && val.length === 0) return false;
        return true;
      });

      // If no valid entries, skip this object
      if (filteredEntries.length === 0) {
        return result;
      }

      // If this is a main field (depth 0), show the main field title as right-aligned heading
      if (isMainField && depth === 0) {
        result.push(
          <List.Item.Detail.Metadata.Label
            key={`main-field-${fieldTitle}`}
            title=""
            text={{
              color: Color.Blue,
              value: fieldTitle,
            }}
          />,
        );
      }

      // If this is a nested object (depth > 0), show as left-aligned sub-heading
      if (depth > 0) {
        result.push(
          <List.Item.Detail.Metadata.Label
            key={`sub-heading-${keyPrefix}-${fieldTitle}`}
            title={fieldTitle}
            text={{
              color: Color.SecondaryText,
              value: "",
            }}
          />,
        );
      }

      filteredEntries.forEach(([key, val]) => {
        const nestedFieldTitle = camelCaseToWords(key);
        const newKeyPrefix = keyPrefix ? `${keyPrefix}.${key}` : key;

        const nestedResults = processNestedValue(val, fieldType, nestedFieldTitle, newKeyPrefix, depth + 1, false);
        result.push(...nestedResults);
      });
    }

    return result;
  };

  const processRecordFieldsMetadata = (fields: RecordField[], isCustom: boolean = false) => {
    if (!Array.isArray(fields) || fields.length === 0) return [];

    const responseData: React.ReactNode[] = [];

    for (const field of fields) {
      const fieldValue = field.value;
      const fieldTitle = camelCaseToWords(field.label || field.name || field.type || "");

      // Handle both array and non-array values
      if (Array.isArray(fieldValue)) {
        if (fieldValue.length === 0) continue;
        if (isFieldToSkip(field.type)) continue;

        fieldValue.forEach((value, index) => {
          // Skip null, undefined, or empty values at the top level too
          if (value === null || value === undefined) return;
          if (typeof value === "string" && value.trim() === "") return;
          if (Array.isArray(value) && value.length === 0) return;

          if (typeof value === "string") {
            const { processedDisplayValue, processedCopyValue } = processFieldStringValue(field.type, value);

            responseData.push(
              <List.Item.Detail.Metadata.TagList
                key={`field-${field.type}-${index}-${fieldTitle}-${Date.now()}`}
                title={fieldTitle}
              >
                <List.Item.Detail.Metadata.TagList.Item
                  key={`field-${field.type}-${index}-${fieldTitle}-${Date.now()}`}
                  text={processedDisplayValue}
                  onAction={() => {
                    Clipboard.copy(processedCopyValue);
                    showToast({
                      style: Toast.Style.Success,
                      title: `${fieldTitle} ${SUCCESS_MESSAGES.COPIED_TO_CLIPBOARD}`,
                    });
                  }}
                />
              </List.Item.Detail.Metadata.TagList>,
            );
          } else if (typeof value === "number") {
            const { processedDisplayValue, processedCopyValue } = processFieldNumberValue(field.type, value);

            responseData.push(
              <List.Item.Detail.Metadata.TagList
                key={`field-${field.type}-${index}-${fieldTitle}-${Date.now()}`}
                title={fieldTitle}
              >
                <List.Item.Detail.Metadata.TagList.Item
                  key={`field-${field.type}-${index}-${fieldTitle}-${Date.now()}`}
                  text={processedDisplayValue}
                  onAction={() => {
                    Clipboard.copy(processedCopyValue);
                    showToast({
                      style: Toast.Style.Success,
                      title: `${fieldTitle} ${SUCCESS_MESSAGES.COPIED_TO_CLIPBOARD}`,
                    });
                  }}
                />
              </List.Item.Detail.Metadata.TagList>,
            );
          } else if (typeof value === "object" && value !== null) {
            // Use the generic recursive function for any object
            const nestedResults = processNestedValue(
              value,
              field.type,
              fieldTitle,
              fieldTitle,
              0,
              true, // This is a main field
            );
            responseData.push(...nestedResults);
          } else {
            const displayValue = String(value);
            responseData.push(
              <List.Item.Detail.Metadata.TagList
                key={`field-${field.type}-${index}-${fieldTitle}-${Date.now()}`}
                title={fieldTitle}
              >
                <List.Item.Detail.Metadata.TagList.Item
                  key={`field-${field.type}-${index}-${fieldTitle}-${Date.now()}`}
                  text={displayValue}
                  onAction={() => {
                    Clipboard.copy(displayValue);
                    showToast({
                      style: Toast.Style.Success,
                      title: `${fieldTitle} ${SUCCESS_MESSAGES.COPIED_TO_CLIPBOARD}`,
                    });
                  }}
                />
              </List.Item.Detail.Metadata.TagList>,
            );
          }
        });
      } else {
        // Handle non-array values (new format)
        if (isFieldToSkip(field.type)) continue;
        if (fieldValue === null || fieldValue === undefined) continue;
        if (typeof fieldValue === "string" && (fieldValue as string).trim() === "") continue;

        if (typeof fieldValue === "string") {
          const { processedDisplayValue, processedCopyValue } = processFieldStringValue(field.type, fieldValue);

          responseData.push(
            <List.Item.Detail.Metadata.TagList
              key={`field-${field.type}-0-${fieldTitle}-${Date.now()}`}
              title={fieldTitle}
            >
              <List.Item.Detail.Metadata.TagList.Item
                key={`field-${field.type}-0-${fieldTitle}-${Date.now()}`}
                text={processedDisplayValue}
                onAction={() => {
                  Clipboard.copy(processedCopyValue);
                  showToast({
                    style: Toast.Style.Success,
                    title: `${fieldTitle} ${SUCCESS_MESSAGES.COPIED_TO_CLIPBOARD}`,
                  });
                }}
              />
            </List.Item.Detail.Metadata.TagList>,
          );
        } else if (typeof fieldValue === "number") {
          const { processedDisplayValue, processedCopyValue } = processFieldNumberValue(field.type, fieldValue);

          responseData.push(
            <List.Item.Detail.Metadata.TagList
              key={`field-${field.type}-0-${fieldTitle}-${Date.now()}`}
              title={fieldTitle}
            >
              <List.Item.Detail.Metadata.TagList.Item
                key={`field-${field.type}-0-${fieldTitle}-${Date.now()}`}
                text={processedDisplayValue}
                onAction={() => {
                  Clipboard.copy(processedCopyValue);
                  showToast({
                    style: Toast.Style.Success,
                    title: `${fieldTitle} ${SUCCESS_MESSAGES.COPIED_TO_CLIPBOARD}`,
                  });
                }}
              />
            </List.Item.Detail.Metadata.TagList>,
          );
        } else if (typeof fieldValue === "object" && fieldValue !== null) {
          const nestedResults = processNestedValue(fieldValue, field.type, fieldTitle, fieldTitle, 0, true);
          responseData.push(...nestedResults);
        } else {
          const displayValue = String(fieldValue);
          responseData.push(
            <List.Item.Detail.Metadata.TagList
              key={`field-${field.type}-0-${fieldTitle}-${Date.now()}`}
              title={fieldTitle}
            >
              <List.Item.Detail.Metadata.TagList.Item
                key={`field-${field.type}-0-${fieldTitle}-${Date.now()}`}
                text={displayValue}
                onAction={() => {
                  Clipboard.copy(displayValue);
                  showToast({
                    style: Toast.Style.Success,
                    title: `${fieldTitle} ${SUCCESS_MESSAGES.COPIED_TO_CLIPBOARD}`,
                  });
                }}
              />
            </List.Item.Detail.Metadata.TagList>,
          );
        }
      }
      responseData.push(
        <List.Item.Detail.Metadata.Separator key={`field-${field.type}-${fieldTitle}-separator-${Date.now()}`} />,
      );
    }

    return responseData.length > 0
      ? [
          <List.Item.Detail.Metadata.Label
            title={""}
            key={isCustom ? "custom-fields" : "fields"}
            text={{ color: Color.Blue, value: isCustom ? "Custom Fields" : "Fields" }}
          />,
          ...responseData,
        ]
      : [];
  };

  const processRecordInfoMetadata = (recordDetails: DetailedRecordResponse) => {
    const responseData = [];

    if (recordDetails.title) {
      responseData.push(<List.Item.Detail.Metadata.Label key="title" title="Title" text={recordDetails.title} />);
    }

    if (recordDetails.type) {
      responseData.push(
        <List.Item.Detail.Metadata.TagList title="Type" key="type">
          <List.Item.Detail.Metadata.TagList.Item
            key={`type-${recordDetails.type}`}
            text={RECORD_TYPE_TO_TITLE_MAP[recordDetails.type as RecordTypes] ?? camelCaseToWords(recordDetails.type)}
            color={Color.SecondaryText}
          />
        </List.Item.Detail.Metadata.TagList>,
      );
    }

    if (recordDetails.client_modified_time) {
      responseData.push(
        <List.Item.Detail.Metadata.Label
          key="modified"
          title="Modified"
          text={new Date(recordDetails.client_modified_time).toLocaleString()}
        />,
      );
    }

    if (recordDetails.shared === true || recordDetails.shared === false) {
      responseData.push(
        <List.Item.Detail.Metadata.TagList key="shared" title="Shared">
          <List.Item.Detail.Metadata.TagList.Item
            key={`shared-${recordDetails.shared}`}
            text={recordDetails.shared ? "Yes" : "No"}
            color={recordDetails.shared ? Color.Green : Color.Red}
          />
        </List.Item.Detail.Metadata.TagList>,
      );
    }

    if (recordDetails.notes) {
      responseData.push(<List.Item.Detail.Metadata.Label key="notes" title="Notes" text={recordDetails.notes} />);
    }

    // for general record types fields
    ["login", "password", "login_url"].forEach((field) => {
      if (recordDetails[field as keyof DetailedRecordResponse]) {
        const fieldValue = recordDetails[field as keyof DetailedRecordResponse];

        // Skip if field should be skipped
        if (isFieldToSkip(field)) return;

        // Skip null, undefined, or empty values
        if (fieldValue === null || fieldValue === undefined) return;
        if (typeof fieldValue === "string" && fieldValue.trim() === "") return;
        if (Array.isArray(fieldValue) && fieldValue.length === 0) return;

        let processedDisplayValue: string;
        let processedCopyValue: string;

        if (typeof fieldValue === "string") {
          const result = processFieldStringValue(field, fieldValue);
          processedDisplayValue = result.processedDisplayValue;
          processedCopyValue = result.processedCopyValue;
        } else if (typeof fieldValue === "number") {
          const result = processFieldNumberValue(field, fieldValue);
          processedDisplayValue = result.processedDisplayValue;
          processedCopyValue = result.processedCopyValue;
        } else if (Array.isArray(fieldValue)) {
          // Handle arrays - join non-empty values
          const filteredArray = fieldValue.filter(
            (item) => item !== null && item !== undefined && (typeof item !== "string" || item.trim() !== ""),
          );
          if (filteredArray.length === 0) return;

          const arrayValue = filteredArray.map((item) => String(item)).join(", ");
          processedDisplayValue = arrayValue;
          processedCopyValue = arrayValue;
        } else {
          // Handle other types (boolean, object, etc.)
          processedDisplayValue = String(fieldValue);
          processedCopyValue = String(fieldValue);
        }

        responseData.push(
          <List.Item.Detail.Metadata.TagList
            title={camelCaseToWords(field)}
            key={`${field}-${Date.now()}-${Math.random()}`}
          >
            <List.Item.Detail.Metadata.TagList.Item
              key={`${field}-${processedDisplayValue}-${Date.now()}`}
              text={processedDisplayValue}
              onAction={() => {
                Clipboard.copy(processedCopyValue);
                showToast({
                  style: Toast.Style.Success,
                  title: `${camelCaseToWords(field)} ${SUCCESS_MESSAGES.COPIED_TO_CLIPBOARD}`,
                });
              }}
            />
          </List.Item.Detail.Metadata.TagList>,
        );
      }
    });

    return responseData;
  };

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="" text={{ color: Color.Blue, value: "Record Information" }} />
          <List.Item.Detail.Metadata.Label
            title=""
            text={{ color: Color.SecondaryText, value: "Click tags to copy values to clipboard" }}
            icon={Icon.Info}
          />

          <List.Item.Detail.Metadata.Separator />

          {/* More information related to the record */}
          {processRecordInfoMetadata(recordDetails)}

          <List.Item.Detail.Metadata.Separator />

          {processRecordFieldsMetadata(recordDetails.fields)}

          <List.Item.Detail.Metadata.Separator />

          {processRecordFieldsMetadata(recordDetails.custom as RecordField[], true)}

          <List.Item.Detail.Metadata.Separator />

          {processRecordFieldsMetadata(recordDetails["custom_fields"] as RecordField[], true)}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
