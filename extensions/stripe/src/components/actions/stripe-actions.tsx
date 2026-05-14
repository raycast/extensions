import { Action, Icon, Keyboard } from "@raycast/api";
import { SHORTCUTS } from "@src/constants/keyboard-shortcuts";

/**
 * Reusable action components for common Stripe operations.
 * These components provide consistent UX across different views.
 */

/**
 * Action to copy an ID to clipboard.
 *
 * @param props.id - The ID to copy
 * @param props.title - Custom title for the action (default: "Copy ID")
 *
 * @example
 * ```typescript
 * <CopyIdAction id={charge.id} title="Copy Charge ID" />
 * ```
 */
export const CopyIdAction = ({ id, title = "Copy ID" }: { id: string; title?: string }) => (
  <Action.CopyToClipboard title={title} content={id} shortcut={SHORTCUTS.COPY_PRIMARY} />
);

/**
 * Action to open a Stripe Dashboard URL in browser.
 *
 * @param props.url - The Stripe Dashboard URL
 * @param props.title - Custom title for the action (default: "View in Stripe Dashboard")
 *
 * @example
 * ```typescript
 * <ViewInDashboardAction url={`${dashboardUrl}/customers/${customerId}`} />
 * ```
 */
export const ViewInDashboardAction = ({ url, title = "View in Stripe Dashboard" }: { url: string; title?: string }) => (
  <Action.OpenInBrowser title={title} url={url} icon={Icon.Globe} />
);

/**
 * Action to copy a customer ID to clipboard.
 *
 * @param props.customerId - The customer ID to copy
 *
 * @example
 * ```typescript
 * <CopyCustomerIdAction customerId={charge.customer} />
 * ```
 */
export const CopyCustomerIdAction = ({ customerId }: { customerId: string }) => (
  <Action.CopyToClipboard title="Copy Customer ID" content={customerId} shortcut={SHORTCUTS.COPY_CUSTOMER_ID} />
);

/**
 * Action to copy an email address to clipboard.
 *
 * @param props.email - The email address to copy
 *
 * @example
 * ```typescript
 * <CopyEmailAction email={customer.email} />
 * ```
 */
export const CopyEmailAction = ({ email }: { email: string }) => (
  <Action.CopyToClipboard title="Copy Email" content={email} shortcut={SHORTCUTS.COPY_EMAIL} />
);

/**
 * Action to copy a formatted amount to clipboard.
 *
 * @param props.amount - The formatted amount string to copy
 *
 * @example
 * ```typescript
 * const formattedAmount = formatAmount(charge.amount, charge.currency);
 * <CopyAmountAction amount={formattedAmount} />
 * ```
 */
export const CopyAmountAction = ({ amount }: { amount: string }) => (
  <Action.CopyToClipboard title="Copy Amount" content={amount} shortcut={SHORTCUTS.COPY_AMOUNT} />
);

/**
 * Action to open a URL in browser with a custom icon and title.
 *
 * @param props.url - The URL to open
 * @param props.title - The action title
 * @param props.icon - Optional icon for the action
 * @param props.shortcut - Optional keyboard shortcut
 *
 * @example
 * ```typescript
 * <OpenUrlAction
 *   url={charge.receipt_url}
 *   title="View Receipt"
 *   icon={Icon.Receipt}
 * />
 * ```
 */
export const OpenUrlAction = ({
  url,
  title,
  icon,
  shortcut,
}: {
  url: string;
  title: string;
  icon?: Icon;
  shortcut?: Keyboard.Shortcut;
}) => <Action.OpenInBrowser title={title} url={url} icon={icon} shortcut={shortcut} />;
