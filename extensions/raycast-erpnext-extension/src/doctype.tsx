import React, { useState, useEffect } from "react";
import { List, ActionPanel, Action, showToast, Toast, Icon, Color } from "@raycast/api";
import { erpNextAPI } from "./api";
import { DocType, DocTypeItem } from "./types";
import { DocumentDetail } from "./document-detail";

export default function Command() {
  const [docTypes, setDocTypes] = useState<DocType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    async function fetchDocTypes() {
      try {
        setLoading(true);
        const types = await erpNextAPI.getDocTypes();
        setDocTypes(types);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch DocTypes",
          message: error instanceof Error ? error.message : "Unknown error occurred",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchDocTypes();
  }, []);

  const filteredDocTypes = docTypes.filter((docType) => docType.name.toLowerCase().includes(searchText.toLowerCase()));

  return (
    <List isLoading={loading} onSearchTextChange={setSearchText} searchBarPlaceholder="Search DocTypes..." throttle>
      {filteredDocTypes.map((docType) => (
        <List.Item
          key={docType.name}
          title={docType.name}
          subtitle={docType.module}
          accessories={[
            ...(docType.custom ? [{ text: "Custom", icon: Icon.Gear, tooltip: "Custom DocType" }] : []),
            ...(docType.is_submittable
              ? [
                  {
                    text: "Submittable",
                    icon: Icon.CheckCircle,
                    tooltip: "Submittable DocType",
                  },
                ]
              : []),
          ]}
          icon={{
            source: Icon.Document,
            tintColor: docType.custom ? Color.Orange : Color.Blue,
          }}
          actions={
            <ActionPanel>
              <Action.Push title="View Items" icon={Icon.List} target={<DocTypeItemsView docType={docType} />} />
              <Action.OpenInBrowser
                title="Create New Document"
                icon={Icon.Plus}
                url={erpNextAPI.getNewDocumentURL(docType.name)}
              />
              <Action.CopyToClipboard
                title="Copy Doctype Name"
                content={docType.name}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            </ActionPanel>
          }
        />
      ))}
      {!loading && filteredDocTypes.length === 0 && (
        <List.EmptyView
          title="No DocTypes Found"
          description="Try adjusting your search or check your ERPNext connection"
          icon={Icon.MagnifyingGlass}
        />
      )}
    </List>
  );
}

// Component for viewing items of a specific DocType
function DocTypeItemsView({ docType }: { docType: DocType }) {
  const [items, setItems] = useState<DocTypeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    async function fetchItems() {
      try {
        setLoading(true);
        const fetchedItems = await erpNextAPI.getDocTypeItems(docType.name);
        setItems(fetchedItems);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: `Failed to fetch ${docType.name} items`,
          message: error instanceof Error ? error.message : "Unknown error occurred",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchItems();
  }, [docType.name]);

  const filteredItems = items.filter((item) => item.name.toLowerCase().includes(searchText.toLowerCase()));

  return (
    <List
      isLoading={loading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={`Search ${docType.name} items...`}
      navigationTitle={`${docType.name} Items`}
      throttle
    >
      {filteredItems.map((item) => (
        <List.Item
          key={item.name}
          title={item.name}
          subtitle={item.modified ? `Modified: ${new Date(item.modified).toLocaleDateString()}` : undefined}
          accessories={[
            ...(item.docstatus !== undefined
              ? [
                  {
                    text: item.docstatus === 0 ? "Draft" : item.docstatus === 1 ? "Submitted" : "Cancelled",
                    icon:
                      item.docstatus === 0 ? Icon.Circle : item.docstatus === 1 ? Icon.CheckCircle : Icon.XMarkCircle,
                    tooltip: `Status: ${item.docstatus === 0 ? "Draft" : item.docstatus === 1 ? "Submitted" : "Cancelled"}`,
                  },
                ]
              : []),
          ]}
          icon={{
            source: Icon.Document,
            tintColor: item.docstatus === 1 ? Color.Green : item.docstatus === 2 ? Color.Red : Color.Blue,
          }}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Details"
                icon={Icon.Eye}
                target={<DocumentDetail doctype={docType.name} name={item.name} />}
              />
              <Action.OpenInBrowser
                title="Open in Erpnext"
                icon={Icon.Globe}
                url={erpNextAPI.getDocumentURL(docType.name, item.name)}
              />
              <Action.CopyToClipboard
                title="Copy Document Name"
                content={item.name}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            </ActionPanel>
          }
        />
      ))}
      {!loading && filteredItems.length === 0 && (
        <List.EmptyView
          title={`No ${docType.name} Items Found`}
          description="Try adjusting your search or create a new document"
          icon={Icon.MagnifyingGlass}
        />
      )}
    </List>
  );
}
