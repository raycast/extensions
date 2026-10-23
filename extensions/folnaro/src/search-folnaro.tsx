import {
  Action,
  ActionPanel,
  Icon,
  Keyboard,
  List,
  Toast,
  launchCommand,
  LaunchType,
  open,
  showToast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { BRAND_ACCENT, statusColor } from "./lib/brand";
import type { FolnaroApi } from "./lib/folnaro";
import {
  centsFromDecimal,
  documentNumberLabel,
  documentStatusKey,
  documentStatusTone,
  formatDate,
  formatMoney,
} from "./lib/format";
import { t, type StringKey } from "./lib/text";
import { openFolnaro, quickLook, savePdf, showError, useFolnaro } from "./lib/raycast";
import { EMPTY_RESULTS, SEARCH_SCOPES, isEmpty, recordLink, runSearch, type SearchScope } from "./lib/search";
import type { Customer, DocumentSummary, Expense, Project } from "./lib/types";

export default function SearchFolnaro() {
  const api = useFolnaro();
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<SearchScope>("all");
  const [showingDetail, setShowingDetail] = useState(false);

  const { data, isLoading, revalidate } = usePromise(
    (text: string, selected: SearchScope) => runSearch(api, text.trim(), selected),
    [query, scope],
    { onError: (error) => void showError(error) },
  );

  const results = data ?? EMPTY_RESULTS;
  const customers = results.projectCustomers;
  const shared = {
    api,
    showingDetail,
    toggleDetail: () => setShowingDetail((value) => !value),
    revalidate,
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={t("search.placeholder")}
      onSearchTextChange={setQuery}
      throttle
      isShowingDetail={showingDetail && !isEmpty(results)}
      searchBarAccessory={
        <List.Dropdown tooltip={t("search.scope")} storeValue onChange={(value) => setScope(value as SearchScope)}>
          {SEARCH_SCOPES.map((item) => (
            <List.Dropdown.Item
              key={item}
              value={item}
              title={t(item === "all" ? "search.scope.all" : (`search.section.${item}` as StringKey))}
            />
          ))}
        </List.Dropdown>
      }
    >
      {!isLoading && isEmpty(results) ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={t("search.empty.title")}
          description={t("search.empty.description")}
        />
      ) : null}
      <List.Section title={t("search.section.invoices")}>
        {results.invoices.map((document) => (
          <DocumentItem key={document.id} document={document} {...shared} />
        ))}
      </List.Section>
      <List.Section title={t("search.section.quotes")}>
        {results.quotes.map((document) => (
          <DocumentItem key={document.id} document={document} {...shared} />
        ))}
      </List.Section>
      <List.Section title={t("search.section.customers")}>
        {results.customers.map((customer) => (
          <CustomerItem key={customer.id} customer={customer} {...shared} />
        ))}
      </List.Section>
      <List.Section title={t("search.section.expenses")}>
        {results.expenses.map((expense) => (
          <ExpenseItem key={expense.id} expense={expense} {...shared} />
        ))}
      </List.Section>
      <List.Section title={t("search.section.projects")}>
        {results.projects.map((project) => (
          <ProjectItem
            key={project.id}
            project={project}
            customer={project.customer_id ? customers.get(project.customer_id) : undefined}
            {...shared}
          />
        ))}
      </List.Section>
    </List>
  );
}

interface SharedProps {
  api: FolnaroApi;
  showingDetail: boolean;
  toggleDetail: () => void;
  revalidate: () => void;
}

function CommonActions(props: SharedProps & { link: string }) {
  return (
    <>
      <ActionPanel.Section>
        <Action
          title={t("action.toggleDetails")}
          icon={Icon.Sidebar}
          shortcut={{ modifiers: ["cmd"], key: "d" }}
          onAction={props.toggleDetail}
        />
        <Action.CopyToClipboard
          title={t("action.copyLink")}
          content={props.link}
          shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
        />
        <Action
          title={t("action.refresh")}
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={props.revalidate}
        />
      </ActionPanel.Section>
    </>
  );
}

function OpenInFolnaro({ link }: { link: string }) {
  return (
    <Action
      title={t("action.openInFolnaro")}
      icon={Icon.AppWindow}
      onAction={() => openFolnaro(link).catch((error) => showError(error))}
    />
  );
}

function DocumentItem(props: SharedProps & { document: DocumentSummary }) {
  const { document, api } = props;
  const link = recordLink("document", document.id);
  const tone = documentStatusTone(document);
  const status = t(documentStatusKey(document) as StringKey);
  const amount = formatMoney(document.gross_total_cents);
  const openCents =
    document.open_amount_cents ?? (document.open_amount ? centsFromDecimal(document.open_amount) : undefined);
  const accessories: List.Item.Accessory[] = [];
  if (!props.showingDetail) {
    if (document.due_date && !document.is_draft && document.status !== "paid" && document.status !== "cancelled") {
      accessories.push({
        text: formatDate(document.due_date),
        icon: Icon.Calendar,
        tooltip: t("search.dueOn", { date: formatDate(document.due_date) }),
      });
    }
    accessories.push({ text: amount });
  }
  accessories.push({
    icon: { source: Icon.CircleFilled, tintColor: statusColor(tone) },
    text: status,
    tooltip:
      document.is_overdue && document.days_overdue ? t("search.overdueBy", { days: document.days_overdue }) : undefined,
  });

  const quickLookPdf = async (openInsteadOfPreview: boolean) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: t("toast.loadingPdf") });
    try {
      const path = await savePdf(api, document.id);
      await toast.hide();
      if (openInsteadOfPreview) await open(path);
      else quickLook(path);
    } catch (error) {
      await toast.hide();
      await showError(error);
    }
  };

  return (
    <List.Item
      icon={{
        source: document.kind === "quote" || document.kind === "orderConfirmation" ? Icon.Document : Icon.Receipt,
        tintColor: BRAND_ACCENT,
      }}
      title={documentNumberLabel(document)}
      subtitle={props.showingDetail ? undefined : [document.customer_name, document.title].filter(Boolean).join(" · ")}
      keywords={[document.customer_name ?? "", document.title ?? ""].filter(Boolean)}
      accessories={accessories}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title={t("field.kind")} text={t(`kind.${document.kind}` as StringKey)} />
              <List.Item.Detail.Metadata.Label title={t("field.number")} text={documentNumberLabel(document)} />
              <List.Item.Detail.Metadata.Label
                title={t("field.status")}
                text={status}
                icon={{ source: Icon.CircleFilled, tintColor: statusColor(tone) }}
              />
              {document.customer_name ? (
                <List.Item.Detail.Metadata.Label title={t("field.customer")} text={document.customer_name} />
              ) : null}
              {document.title ? (
                <List.Item.Detail.Metadata.Label title={t("field.title")} text={document.title} />
              ) : null}
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title={t("field.issueDate")} text={formatDate(document.issue_date)} />
              {document.due_date ? (
                <List.Item.Detail.Metadata.Label title={t("field.dueDate")} text={formatDate(document.due_date)} />
              ) : null}
              <List.Item.Detail.Metadata.Separator />
              {document.net_total_cents !== undefined ? (
                <List.Item.Detail.Metadata.Label title={t("field.net")} text={formatMoney(document.net_total_cents)} />
              ) : null}
              {document.tax_total_cents !== undefined ? (
                <List.Item.Detail.Metadata.Label title={t("field.vat")} text={formatMoney(document.tax_total_cents)} />
              ) : null}
              <List.Item.Detail.Metadata.Label title={t("field.gross")} text={amount} />
              {openCents !== undefined && !document.is_draft && openCents !== 0 ? (
                <List.Item.Detail.Metadata.Label title={t("field.open")} text={formatMoney(openCents)} />
              ) : null}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <OpenInFolnaro link={link} />
            <Action
              title={t("action.quickLookPdf")}
              icon={Icon.Eye}
              shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
              onAction={() => quickLookPdf(false)}
            />
            <Action
              title={t("action.openPdf")}
              icon={Icon.Document}
              shortcut={Keyboard.Shortcut.Common.Open}
              onAction={() => quickLookPdf(true)}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            {document.number ? (
              <Action.CopyToClipboard
                title={t("action.copyNumber")}
                content={document.number}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
            ) : null}
            <Action.CopyToClipboard
              title={t("action.copyAmount")}
              content={amount}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
          </ActionPanel.Section>
          <CommonActions {...props} link={link} />
        </ActionPanel>
      }
    />
  );
}

function formatAddress(customer: Customer): string {
  const { street, addition, postal_code, city, country_code } = customer.address;
  return [street, addition, `${postal_code} ${city}`.trim(), country_code === "DE" ? "" : country_code]
    .filter(Boolean)
    .join(", ");
}

function CustomerItem(props: SharedProps & { customer: Customer }) {
  const { customer } = props;
  const link = recordLink("customer", customer.id);
  return (
    <List.Item
      icon={{ source: customer.kind === "person" ? Icon.Person : Icon.Building, tintColor: BRAND_ACCENT }}
      title={customer.display_name}
      subtitle={props.showingDetail ? undefined : customer.address.city}
      accessories={props.showingDetail ? [] : [{ text: customer.number }]}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title={t("field.number")} text={customer.number} />
              {customer.contact_name ? (
                <List.Item.Detail.Metadata.Label title={t("field.customer")} text={customer.contact_name} />
              ) : null}
              {customer.email ? (
                <List.Item.Detail.Metadata.Label title={t("field.email")} text={customer.email} />
              ) : null}
              {customer.phone ? (
                <List.Item.Detail.Metadata.Label title={t("field.phone")} text={customer.phone} />
              ) : null}
              <List.Item.Detail.Metadata.Label title={t("field.address")} text={formatAddress(customer)} />
              {customer.vat_id ? (
                <List.Item.Detail.Metadata.Label title={t("field.vatId")} text={customer.vat_id} />
              ) : null}
              {customer.hourly_rate ? (
                <List.Item.Detail.Metadata.Label
                  title={t("field.hourlyRate")}
                  text={formatMoney(centsFromDecimal(customer.hourly_rate))}
                />
              ) : null}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <OpenInFolnaro link={link} />
            <Action
              title={t("action.createInvoiceForCustomer")}
              icon={Icon.NewDocument}
              shortcut={Keyboard.Shortcut.Common.New}
              onAction={() =>
                launchCommand({
                  name: "create-invoice-draft",
                  type: LaunchType.UserInitiated,
                  context: { customerId: customer.id },
                }).catch((error) => showError(error))
              }
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title={t("action.copyNumber")}
              content={customer.number}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
            {customer.email ? (
              <Action.CopyToClipboard
                title={t("action.copyEmail")}
                content={customer.email}
                shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
              />
            ) : null}
          </ActionPanel.Section>
          <CommonActions {...props} link={link} />
        </ActionPanel>
      }
    />
  );
}

function ExpenseItem(props: SharedProps & { expense: Expense }) {
  const { expense } = props;
  const link = recordLink("expense", expense.id);
  const amount = formatMoney(expense.gross_amount_cents);
  const statusTone = expense.status === "booked" ? "paid" : expense.status === "voided" ? "cancelled" : "open";
  const status = t(`expenseStatus.${expense.status}` as StringKey);
  return (
    <List.Item
      icon={{ source: Icon.Cart, tintColor: BRAND_ACCENT }}
      title={expense.vendor}
      subtitle={props.showingDetail ? undefined : expense.category_title}
      accessories={[
        ...(props.showingDetail
          ? []
          : [
              {
                icon: expense.has_receipt ? Icon.Paperclip : undefined,
                tooltip: expense.has_receipt ? t("search.hasReceipt") : undefined,
              },
              { text: formatDate(expense.date) },
              { text: amount },
            ]),
        { icon: { source: Icon.CircleFilled, tintColor: statusColor(statusTone) }, text: status },
      ]}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title={t("field.vendor")} text={expense.vendor} />
              <List.Item.Detail.Metadata.Label title={t("field.issueDate")} text={formatDate(expense.date)} />
              {expense.category_title ? (
                <List.Item.Detail.Metadata.Label title={t("field.category")} text={expense.category_title} />
              ) : null}
              {expense.invoice_number ? (
                <List.Item.Detail.Metadata.Label title={t("field.invoiceNumber")} text={expense.invoice_number} />
              ) : null}
              <List.Item.Detail.Metadata.Label
                title={t("field.status")}
                text={status}
                icon={{ source: Icon.CircleFilled, tintColor: statusColor(statusTone) }}
              />
              <List.Item.Detail.Metadata.Separator />
              {expense.net_amount ? (
                <List.Item.Detail.Metadata.Label
                  title={t("field.net")}
                  text={formatMoney(centsFromDecimal(expense.net_amount))}
                />
              ) : null}
              {expense.tax_amount ? (
                <List.Item.Detail.Metadata.Label
                  title={t("field.vat")}
                  text={formatMoney(centsFromDecimal(expense.tax_amount))}
                />
              ) : null}
              <List.Item.Detail.Metadata.Label title={t("field.gross")} text={amount} />
              <List.Item.Detail.Metadata.Label
                title={t("field.receipt")}
                text={
                  expense.has_receipt
                    ? (expense.receipt_original_name ?? t("search.hasReceipt"))
                    : t("search.noReceipt")
                }
              />
              {expense.note ? <List.Item.Detail.Metadata.Label title={t("field.note")} text={expense.note} /> : null}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <OpenInFolnaro link={link} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title={t("action.copyAmount")}
              content={amount}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
            {expense.invoice_number ? (
              <Action.CopyToClipboard
                title={t("action.copyNumber")}
                content={expense.invoice_number}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
            ) : null}
          </ActionPanel.Section>
          <CommonActions {...props} link={link} />
        </ActionPanel>
      }
    />
  );
}

function ProjectItem(props: SharedProps & { project: Project; customer?: Customer }) {
  const { project, customer } = props;
  const link = recordLink("project", project.id);
  const status = project.status ? t(`projectStatus.${project.status}` as StringKey) : undefined;
  const tone = project.status === "active" ? "open" : project.status === "done" ? "paid" : "draft";
  return (
    <List.Item
      icon={{ source: Icon.Folder, tintColor: BRAND_ACCENT }}
      title={project.name}
      subtitle={props.showingDetail ? undefined : (customer?.display_name ?? t("search.noCustomer"))}
      accessories={[
        ...(props.showingDetail || !project.hourly_rate
          ? []
          : [{ text: `${formatMoney(centsFromDecimal(project.hourly_rate))}/h` }]),
        ...(status ? [{ icon: { source: Icon.CircleFilled, tintColor: statusColor(tone) }, text: status }] : []),
      ]}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              {project.number ? (
                <List.Item.Detail.Metadata.Label title={t("field.number")} text={project.number} />
              ) : null}
              <List.Item.Detail.Metadata.Label
                title={t("field.customer")}
                text={customer?.display_name ?? t("search.noCustomer")}
              />
              {status ? <List.Item.Detail.Metadata.Label title={t("field.status")} text={status} /> : null}
              {project.hourly_rate ? (
                <List.Item.Detail.Metadata.Label
                  title={t("field.hourlyRate")}
                  text={formatMoney(centsFromDecimal(project.hourly_rate))}
                />
              ) : null}
              {project.budget_amount ? (
                <List.Item.Detail.Metadata.Label
                  title={t("field.budget")}
                  text={formatMoney(centsFromDecimal(project.budget_amount))}
                />
              ) : null}
              {project.budget_hours ? (
                <List.Item.Detail.Metadata.Label title={t("field.budgetHours")} text={`${project.budget_hours} h`} />
              ) : null}
              {project.notes ? <List.Item.Detail.Metadata.Label title={t("field.note")} text={project.notes} /> : null}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <OpenInFolnaro link={link} />
            <Action
              title={t("action.startTimerForProject")}
              icon={Icon.Play}
              shortcut={{ modifiers: ["cmd"], key: "t" }}
              onAction={() =>
                launchCommand({
                  name: "start-timer",
                  type: LaunchType.UserInitiated,
                  context: { projectId: project.id },
                }).catch((error) => showError(error))
              }
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            {project.number ? (
              <Action.CopyToClipboard
                title={t("action.copyNumber")}
                content={project.number}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
            ) : null}
          </ActionPanel.Section>
          <CommonActions {...props} link={link} />
        </ActionPanel>
      }
    />
  );
}
