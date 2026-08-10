import { Icon, Color } from "@raycast/api";
import { FIX_SPECS } from "./specs";
import { TAGS, MSG_TYPE, SIDE, ORD_STATUS } from "./constants";

export function getOnixsUrl(version: string, tag: number): string {
  // Map FIX versions to OnixS URL path segments
  const versionMap: Record<string, string> = {
    "FIX.4.0": "4.0",
    "FIX.4.1": "4.1",
    "FIX.4.2": "4.2",
    "FIX.4.3": "4.3",
    "FIX.4.4": "4.4",
    "FIX.5.0": "5.0",
    "FIX.5.0SP1": "5.0.sp1",
    "FIX.5.0SP2": "5.0.sp2",
  };

  const urlVersion = versionMap[version] || "4.4"; // Fallback to 4.4
  return `https://www.onixs.biz/fix-dictionary/${urlVersion}/tagNum_${tag}.html`;
}

export function formatFixTimestamp(value: string): string | null {
  // FIX timestamp format: YYYYMMDD-HH:MM:SS or YYYYMMDD-HH:MM:SS.sss
  const regex = /^(\d{4})(\d{2})(\d{2})-(\d{2}):(\d{2}):(\d{2})(?:\.(\d{3}))?$/;
  const match = value.match(regex);

  if (match) {
    const [, year, month, day, hour, minute, second, ms] = match;
    const date = new Date(
      Date.UTC(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hour),
        parseInt(minute),
        parseInt(second),
        ms ? parseInt(ms) : 0,
      ),
    );
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3,
    });
  }
  return null;
}

export function getTagIcon(tag: number, value: string, version: string): Icon {
  switch (tag) {
    case TAGS.MSG_TYPE: // MsgType
      return Icon.Envelope;
    case TAGS.SIDE: // Side
      return value === SIDE.BUY ? Icon.ArrowUpCircle : value === SIDE.SELL ? Icon.ArrowDownCircle : Icon.Circle;
    case TAGS.ORD_STATUS: // OrdStatus
      if (value === ORD_STATUS.NEW) return Icon.Circle;
      if (value === ORD_STATUS.PARTIALLY_FILLED) return Icon.CircleProgress50;
      if (value === ORD_STATUS.FILLED) return Icon.CheckCircle;
      if (value === ORD_STATUS.CANCELED) return Icon.XMarkCircle;
      if (value === ORD_STATUS.REJECTED) return Icon.ExclamationMark;
      return Icon.Circle;
    case TAGS.BEGIN_STRING: // BeginString
      return Icon.Tag;
    // Common Repeating Group Counters
    case 268: // NoMDEntries
    case 453: // NoPartyIDs
    case 555: // NoLegs
    case 73: // NoOrders
    case 146: // NoRelatedSym
      return Icon.Layers;
  }

  const spec = FIX_SPECS[version];
  if (spec) {
    const tagSpec = spec.tags[tag];
    if (tagSpec && tagSpec.type) {
      switch (tagSpec.type) {
        case "STRING":
        case "CHAR":
        case "MULTIPLEVALUESTRING":
        case "EXCHANGE":
        case "COUNTRY":
          return Icon.Text;
        case "PRICE":
        case "AMT":
        case "CURRENCY":
        case "PRICEOFFSET":
        case "FLOAT":
          return Icon.BankNote;
        case "QTY":
          return Icon.Coins;
        case "INT":
        case "SEQNUM":
        case "LENGTH":
        case "PERCENTAGE":
          return Icon.Hashtag;
        case "NUMINGROUP":
          return Icon.Layers;
        case "UTCTIMESTAMP":
        case "UTCTIMEONLY":
        case "UTCDATEONLY":
        case "LOCALMKTDATE":
        case "MONTHYEAR":
        case "TZTIMEONLY":
        case "TZTIMESTAMP":
          return Icon.Clock;
        case "BOOLEAN":
          return value === "Y" ? Icon.CheckCircle : Icon.Circle;
        case "DATA":
        case "XMLDATA":
          return Icon.Paperclip;
      }
    }
  }

  // Fallbacks for common tags if type lookup fails or is generic
  switch (tag) {
    case TAGS.PRICE: // Price
    case TAGS.AVG_PX: // AvgPx
    case TAGS.LAST_PX: // LastPx
      return Icon.BankNote;
    case TAGS.SENDING_TIME: // SendingTime
    case TAGS.TRANSACT_TIME: // TransactTime
      return Icon.Clock;
    default:
      return Icon.Dot;
  }
}

export function getTagColor(tag: number, value: string, version: string): Color | undefined {
  // 1. Value-based specific overrides
  switch (tag) {
    case TAGS.MSG_TYPE: // MsgType
      // Admin Messages
      if (value === MSG_TYPE.HEARTBEAT) return Color.SecondaryText; // Heartbeat
      if (value === MSG_TYPE.TEST_REQUEST) return Color.SecondaryText; // Test Request
      if (value === MSG_TYPE.LOGON) return Color.Purple; // Logon
      if (value === MSG_TYPE.LOGOUT) return Color.Purple; // Logout
      if (value === MSG_TYPE.REJECT) return Color.Red; // Reject
      if (value === MSG_TYPE.BUSINESS_MESSAGE_REJECT) return Color.Red; // Business Message Reject

      // Application Messages
      if (value === MSG_TYPE.NEW_ORDER_SINGLE) return Color.Blue; // New Order Single
      if (value === MSG_TYPE.EXECUTION_REPORT) return Color.Green; // Execution Report
      if (value === MSG_TYPE.ORDER_CANCEL_REQUEST) return Color.Orange; // Order Cancel Request
      if (value === MSG_TYPE.ORDER_CANCEL_REPLACE_REQUEST) return Color.Orange; // Order Cancel/Replace Request
      if (value === MSG_TYPE.ORDER_CANCEL_REJECT) return Color.Red; // Order Cancel Reject

      return Color.Blue; // Default for other MsgTypes
    case TAGS.SIDE: // Side
      return value === SIDE.BUY ? Color.Green : value === SIDE.SELL ? Color.Red : undefined;
    case TAGS.ORD_STATUS: // OrdStatus
      if (value === ORD_STATUS.NEW) return Color.Blue; // New
      if (value === ORD_STATUS.PARTIALLY_FILLED) return Color.Yellow; // Partially Filled
      if (value === ORD_STATUS.FILLED) return Color.Green; // Filled
      if (value === ORD_STATUS.CANCELED) return Color.Red; // Canceled
      if (value === ORD_STATUS.REJECTED) return Color.Red; // Rejected
      return undefined;
  }

  // 2. ID-based specific overrides (Semantic meanings that types don't capture)
  switch (tag) {
    case TAGS.BEGIN_STRING: // BeginString
      return Color.Purple;
    // IDs (Usually STRING, so we need explicit tags)
    case TAGS.CL_ORD_ID: // ClOrdID
    case TAGS.ORDER_ID: // OrderID
    case TAGS.ORIG_CL_ORD_ID: // OrigClOrdID
    case TAGS.EXEC_ID: // ExecID
    case TAGS.SECONDARY_ORDER_ID: // SecondaryOrderID
      return Color.Orange;
    // Parties (Usually STRING)
    case TAGS.ACCOUNT: // Account
    case TAGS.SENDER_COMP_ID: // SenderCompID
    case TAGS.TARGET_COMP_ID: // TargetCompID
    case TAGS.ON_BEHALF_OF_COMP_ID: // OnBehalfOfCompID
    case TAGS.DELIVER_TO_COMP_ID: // DeliverToCompID
      return Color.Magenta;
    // Common Repeating Group Counters
    case 268: // NoMDEntries
    case 453: // NoPartyIDs
    case 555: // NoLegs
    case 73: // NoOrders
    case 146: // NoRelatedSym
      return Color.Purple;
  }

  // 3. Type-based coloring
  const spec = FIX_SPECS[version];
  if (spec) {
    const tagSpec = spec.tags[tag];
    if (tagSpec && tagSpec.type) {
      switch (tagSpec.type) {
        case "PRICE":
        case "AMT":
        case "CURRENCY":
        case "PRICEOFFSET":
        case "FLOAT":
          return Color.Green;
        case "QTY":
          return Color.PrimaryText;
        case "UTCTIMESTAMP":
        case "UTCTIMEONLY":
        case "UTCDATEONLY":
        case "LOCALMKTDATE":
        case "MONTHYEAR":
        case "TZTIMEONLY":
        case "TZTIMESTAMP":
          return Color.SecondaryText;
        case "NUMINGROUP":
          return Color.Purple;
      }
    }
  }

  return undefined;
}

export function getFixMessageSummary(fields: { tag: number; value: string; name: string }[]): string {
  const msgType = fields.find((f) => f.tag === TAGS.MSG_TYPE)?.value;
  const symbol = fields.find((f) => f.tag === TAGS.SYMBOL)?.value;
  const side = fields.find((f) => f.tag === TAGS.SIDE)?.value;
  const qty = fields.find((f) => f.tag === TAGS.ORDER_QTY)?.value;
  const price = fields.find((f) => f.tag === TAGS.PRICE)?.value;
  const text = fields.find((f) => f.tag === TAGS.TEXT)?.value;

  const sideStr = side === SIDE.BUY ? "Buy" : side === SIDE.SELL ? "Sell" : side;

  if (msgType === MSG_TYPE.NEW_ORDER_SINGLE) {
    const parts = [sideStr, qty, symbol];
    if (price) parts.push(`@ ${price}`);
    return parts.filter(Boolean).join(" ");
  }

  if (msgType === MSG_TYPE.EXECUTION_REPORT) {
    const ordStatus = fields.find((f) => f.tag === TAGS.ORD_STATUS)?.value;
    const lastPx = fields.find((f) => f.tag === TAGS.LAST_PX)?.value;
    const lastQty = fields.find((f) => f.tag === 32)?.value; // LastQty
    const leavesQty = fields.find((f) => f.tag === TAGS.LEAVES_QTY)?.value;

    let statusStr = "Exec";
    if (ordStatus === ORD_STATUS.FILLED) statusStr = "Filled";
    else if (ordStatus === ORD_STATUS.PARTIALLY_FILLED) statusStr = "Partial Fill";
    else if (ordStatus === ORD_STATUS.CANCELED) statusStr = "Canceled";
    else if (ordStatus === ORD_STATUS.REJECTED) statusStr = "Rejected";
    else if (ordStatus === ORD_STATUS.NEW) statusStr = "New";

    if (ordStatus === ORD_STATUS.FILLED) {
      return `${statusStr}: ${sideStr} ${lastQty || qty || ""} ${symbol || ""} @ ${lastPx || price || ""}`;
    }

    if (ordStatus === ORD_STATUS.PARTIALLY_FILLED) {
      return `${statusStr}: ${sideStr} ${lastQty || ""} ${symbol || ""} @ ${lastPx || price || ""} (Leaves: ${leavesQty || "?"})`;
    }

    if (ordStatus === ORD_STATUS.REJECTED) {
      return `Rejected: ${text || "No reason given"}`;
    }

    return `${statusStr}: ${symbol || ""} ${sideStr || ""} ${qty || ""}`;
  }

  if (msgType === MSG_TYPE.ORDER_CANCEL_REQUEST) {
    return `Cancel Request: ${sideStr} ${qty} ${symbol}`;
  }

  if (msgType === MSG_TYPE.REJECT) {
    return `Session Reject: ${text || ""}`;
  }

  return "";
}
