import { Action, ActionPanel, Clipboard, Icon, List, Toast, showToast } from "@raycast/api";

interface Currency {
  symbol: string;
  name: string;
  code: string;
  country: string;
  keywords: string[];
}

const currencies: Currency[] = [
  { symbol: "₦", name: "Naira", code: "NGN", country: "Nigeria", keywords: ["nigeria", "naira", "ngn"] },
  { symbol: "$", name: "Dollar", code: "USD", country: "United States", keywords: ["dollar", "usd", "us", "america"] },
  { symbol: "€", name: "Euro", code: "EUR", country: "European Union", keywords: ["euro", "eur", "europe"] },
  { symbol: "£", name: "Pound Sterling", code: "GBP", country: "United Kingdom", keywords: ["pound", "gbp", "uk", "britain", "sterling"] },
  { symbol: "¥", name: "Yen", code: "JPY", country: "Japan", keywords: ["yen", "jpy", "japan"] },
  { symbol: "元", name: "Yuan / Renminbi", code: "CNY", country: "China", keywords: ["yuan", "renminbi", "cny", "china", "rmb"] },
  { symbol: "₹", name: "Rupee", code: "INR", country: "India", keywords: ["rupee", "inr", "india"] },
  { symbol: "₩", name: "Won", code: "KRW", country: "South Korea", keywords: ["won", "krw", "korea"] },
  { symbol: "₽", name: "Ruble", code: "RUB", country: "Russia", keywords: ["ruble", "rub", "russia"] },
  { symbol: "R$", name: "Real", code: "BRL", country: "Brazil", keywords: ["real", "brl", "brazil"] },
  { symbol: "₫", name: "Dong", code: "VND", country: "Vietnam", keywords: ["dong", "vnd", "vietnam"] },
  { symbol: "฿", name: "Baht", code: "THB", country: "Thailand", keywords: ["baht", "thb", "thailand"] },
  { symbol: "₺", name: "Lira", code: "TRY", country: "Turkey", keywords: ["lira", "try", "turkey"] },
  { symbol: "₴", name: "Hryvnia", code: "UAH", country: "Ukraine", keywords: ["hryvnia", "uah", "ukraine"] },
  { symbol: "₸", name: "Tenge", code: "KZT", country: "Kazakhstan", keywords: ["tenge", "kzt", "kazakhstan"] },
  { symbol: "₼", name: "Manat", code: "AZN", country: "Azerbaijan", keywords: ["manat", "azn", "azerbaijan"] },
  { symbol: "₾", name: "Lari", code: "GEL", country: "Georgia", keywords: ["lari", "gel", "georgia"] },
  { symbol: "₿", name: "Bitcoin", code: "BTC", country: "Cryptocurrency", keywords: ["bitcoin", "btc", "crypto", "cryptocurrency"] },
  { symbol: "Ξ", name: "Ethereum", code: "ETH", country: "Cryptocurrency", keywords: ["ethereum", "eth", "crypto"] },
  { symbol: "R", name: "Rand", code: "ZAR", country: "South Africa", keywords: ["rand", "zar", "south africa"] },
  { symbol: "ksh", name: "Shilling", code: "KES", country: "Kenya", keywords: ["shilling", "kes", "kenya"] },
  { symbol: "GH₵", name: "Cedi", code: "GHS", country: "Ghana", keywords: ["cedi", "ghs", "ghana"] },
  { symbol: "Fr", name: "Franc", code: "CHF", country: "Switzerland", keywords: ["franc", "chf", "switzerland", "swiss"] },
  { symbol: "kr", name: "Krone", code: "SEK", country: "Sweden / Norway / Denmark", keywords: ["krone", "sek", "nok", "dkk", "sweden", "norway", "denmark", "scandinavian"] },
  { symbol: "zł", name: "Złoty", code: "PLN", country: "Poland", keywords: ["zloty", "pln", "poland"] },
  { symbol: "Kč", name: "Koruna", code: "CZK", country: "Czech Republic", keywords: ["koruna", "czk", "czech"] },
  { symbol: "Ft", name: "Forint", code: "HUF", country: "Hungary", keywords: ["forint", "huf", "hungary"] },
  { symbol: "lei", name: "Leu", code: "RON", country: "Romania", keywords: ["leu", "ron", "romania"] },
  { symbol: "лв", name: "Lev", code: "BGN", country: "Bulgaria", keywords: ["lev", "bgn", "bulgaria"] },
  { symbol: "₱", name: "Peso (Philippine)", code: "PHP", country: "Philippines", keywords: ["peso", "php", "philippines", "philippine"] },
  { symbol: "$", name: "Peso (Mexican)", code: "MXN", country: "Mexico", keywords: ["peso", "mxn", "mexico", "mexican"] },
  { symbol: "$", name: "Peso (Colombian)", code: "COP", country: "Colombia", keywords: ["peso", "cop", "colombia"] },
  { symbol: "$", name: "Peso (Argentine)", code: "ARS", country: "Argentina", keywords: ["peso", "ars", "argentina"] },
  { symbol: "S/.", name: "Sol", code: "PEN", country: "Peru", keywords: ["sol", "pen", "peru"] },
  { symbol: "CLP$", name: "Peso (Chilean)", code: "CLP", country: "Chile", keywords: ["peso", "clp", "chile"] },
  { symbol: "₡", name: "Colón", code: "CRC", country: "Costa Rica", keywords: ["colon", "crc", "costa rica"] },
  { symbol: "Q", name: "Quetzal", code: "GTQ", country: "Guatemala", keywords: ["quetzal", "gtq", "guatemala"] },
  { symbol: "L", name: "Lempira", code: "HNL", country: "Honduras", keywords: ["lempira", "hnl", "honduras"] },
  { symbol: "C$", name: "Córdoba", code: "NIO", country: "Nicaragua", keywords: ["cordoba", "nio", "nicaragua"] },
  { symbol: "B/.", name: "Balboa", code: "PAB", country: "Panama", keywords: ["balboa", "pab", "panama"] },
  { symbol: "Bs.", name: "Bolívar", code: "VES", country: "Venezuela", keywords: ["bolivar", "ves", "venezuela"] },
  { symbol: "د.إ", name: "Dirham", code: "AED", country: "UAE", keywords: ["dirham", "aed", "uae", "emirates"] },
  { symbol: "ر.س", name: "Riyal (Saudi)", code: "SAR", country: "Saudi Arabia", keywords: ["riyal", "sar", "saudi", "saudi arabia"] },
  { symbol: "﷼", name: "Rial (Iranian)", code: "IRR", country: "Iran", keywords: ["rial", "irr", "iran"] },
  { symbol: "ر.ق", name: "Riyal (Qatari)", code: "QAR", country: "Qatar", keywords: ["riyal", "qar", "qatar"] },
  { symbol: "د.ك", name: "Dinar (Kuwaiti)", code: "KWD", country: "Kuwait", keywords: ["dinar", "kwd", "kuwait"] },
  { symbol: "د.ب", name: "Dinar (Bahraini)", code: "BHD", country: "Bahrain", keywords: ["dinar", "bhd", "bahrain"] },
  { symbol: "ع.د", name: "Dinar (Iraqi)", code: "IQD", country: "Iraq", keywords: ["dinar", "iqd", "iraq"] },
  { symbol: "ج.م", name: "Pound (Egyptian)", code: "EGP", country: "Egypt", keywords: ["pound", "egp", "egypt", "egyptian"] },
  { symbol: "ل.ل", name: "Pound (Lebanese)", code: "LBP", country: "Lebanon", keywords: ["pound", "lbp", "lebanon"] },
  { symbol: "CA$", name: "Dollar (Canadian)", code: "CAD", country: "Canada", keywords: ["dollar", "cad", "canada", "canadian"] },
  { symbol: "A$", name: "Dollar (Australian)", code: "AUD", country: "Australia", keywords: ["dollar", "aud", "australia", "australian"] },
  { symbol: "NZ$", name: "Dollar (New Zealand)", code: "NZD", country: "New Zealand", keywords: ["dollar", "nzd", "new zealand"] },
  { symbol: "S$", name: "Dollar (Singapore)", code: "SGD", country: "Singapore", keywords: ["dollar", "sgd", "singapore"] },
  { symbol: "HK$", name: "Dollar (Hong Kong)", code: "HKD", country: "Hong Kong", keywords: ["dollar", "hkd", "hong kong"] },
  { symbol: "NT$", name: "Dollar (Taiwan)", code: "TWD", country: "Taiwan", keywords: ["dollar", "twd", "taiwan"] },
  { symbol: "₨", name: "Rupee (Pakistani)", code: "PKR", country: "Pakistan", keywords: ["rupee", "pkr", "pakistan"] },
  { symbol: "৳", name: "Taka", code: "BDT", country: "Bangladesh", keywords: ["taka", "bdt", "bangladesh"] },
  { symbol: "රු", name: "Rupee (Sri Lankan)", code: "LKR", country: "Sri Lanka", keywords: ["rupee", "lkr", "sri lanka"] },
  { symbol: "Rf", name: "Rufiyaa", code: "MVR", country: "Maldives", keywords: ["rufiyaa", "mvr", "maldives"] },
  { symbol: "Nu", name: "Ngultrum", code: "BTN", country: "Bhutan", keywords: ["ngultrum", "btn", "bhutan"] },
  { symbol: "₮", name: "Tögrög", code: "MNT", country: "Mongolia", keywords: ["tugrik", "togrog", "mnt", "mongolia"] },
  { symbol: "K", name: "Kyat", code: "MMK", country: "Myanmar", keywords: ["kyat", "mmk", "myanmar", "burma"] },
  { symbol: "៛", name: "Riel", code: "KHR", country: "Cambodia", keywords: ["riel", "khr", "cambodia"] },
  { symbol: "₭", name: "Kip", code: "LAK", country: "Laos", keywords: ["kip", "lak", "laos"] },
  { symbol: "Rp", name: "Rupiah", code: "IDR", country: "Indonesia", keywords: ["rupiah", "idr", "indonesia"] },
  { symbol: "RM", name: "Ringgit", code: "MYR", country: "Malaysia", keywords: ["ringgit", "myr", "malaysia"] },
  { symbol: "₵", name: "Pesewa", code: "GHS", country: "Ghana", keywords: ["pesewa", "cedis", "ghs", "ghana"] },
  { symbol: "F CFA", name: "Franc CFA (West Africa)", code: "XOF", country: "West Africa", keywords: ["franc", "cfa", "xof", "west africa", "senegal", "mali", "burkina"] },
  { symbol: "FCFA", name: "Franc CFA (Central Africa)", code: "XAF", country: "Central Africa", keywords: ["franc", "cfa", "xaf", "central africa", "cameroon", "gabon"] },
  { symbol: "Br", name: "Birr", code: "ETB", country: "Ethiopia", keywords: ["birr", "etb", "ethiopia"] },
  { symbol: "USh", name: "Shilling (Ugandan)", code: "UGX", country: "Uganda", keywords: ["shilling", "ugx", "uganda"] },
  { symbol: "TSh", name: "Shilling (Tanzanian)", code: "TZS", country: "Tanzania", keywords: ["shilling", "tzs", "tanzania"] },
];

export default function SearchCurrencies() {
  return (
    <List
      searchBarPlaceholder="Search by name, code, country, or symbol..."
      throttle
    >
      {currencies.map((currency, index) => (
        <List.Item
          key={`${currency.code}-${index}`}
          icon={currency.symbol.length <= 2 ? { source: Icon.Circle } : { source: Icon.Circle }}
          title={`${currency.symbol}  —  ${currency.name}`}
          subtitle={`${currency.code} · ${currency.country}`}
          accessories={[{ text: currency.symbol }]}
          keywords={[currency.code, currency.country, currency.name, currency.symbol, ...currency.keywords]}
          actions={
            <ActionPanel>
              <Action
                title="Copy Symbol"
                icon={Icon.Clipboard}
                onAction={async () => {
                  await Clipboard.copy(currency.symbol);
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Copied!",
                    message: `${currency.symbol} (${currency.name}) copied to clipboard`,
                  });
                }}
              />
              <Action
                title="Copy Currency Code"
                icon={Icon.Text}
                shortcut={{ modifiers: ["cmd"], key: "k" }}
                onAction={async () => {
                  await Clipboard.copy(currency.code);
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Copied!",
                    message: `${currency.code} copied to clipboard`,
                  });
                }}
              />
              <Action
                title={`Copy with Code (${currency.symbol} ${currency.code})`}
                icon={Icon.AppWindowList}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                onAction={async () => {
                  await Clipboard.copy(`${currency.symbol} ${currency.code}`);
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Copied!",
                    message: `${currency.symbol} ${currency.code} copied to clipboard`,
                  });
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
