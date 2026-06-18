import { Form, ActionPanel, Action, getPreferenceValues, Clipboard, open, showHUD } from "@raycast/api";
import { useState } from "react";
import { normalizeNumber, buildWhatsAppUrl } from "./normalizeNumber";

interface Preferences {
  defaultCountryCode: string;
}

const COUNTRY_CODES: { code: string; label: string }[] = [
  { code: "1", label: "🇺🇸 +1 — USA / Canada" },
  { code: "7", label: "🇷🇺 +7 — Russia / Kazakhstan" },
  { code: "20", label: "🇪🇬 +20 — Egypt" },
  { code: "27", label: "🇿🇦 +27 — South Africa" },
  { code: "30", label: "🇬🇷 +30 — Greece" },
  { code: "31", label: "🇳🇱 +31 — Netherlands" },
  { code: "32", label: "🇧🇪 +32 — Belgium" },
  { code: "33", label: "🇫🇷 +33 — France" },
  { code: "34", label: "🇪🇸 +34 — Spain" },
  { code: "36", label: "🇭🇺 +36 — Hungary" },
  { code: "39", label: "🇮🇹 +39 — Italy" },
  { code: "40", label: "🇷🇴 +40 — Romania" },
  { code: "41", label: "🇨🇭 +41 — Switzerland" },
  { code: "43", label: "🇦🇹 +43 — Austria" },
  { code: "44", label: "🇬🇧 +44 — United Kingdom" },
  { code: "45", label: "🇩🇰 +45 — Denmark" },
  { code: "46", label: "🇸🇪 +46 — Sweden" },
  { code: "47", label: "🇳🇴 +47 — Norway" },
  { code: "48", label: "🇵🇱 +48 — Poland" },
  { code: "49", label: "🇩🇪 +49 — Germany" },
  { code: "51", label: "🇵🇪 +51 — Peru" },
  { code: "52", label: "🇲🇽 +52 — Mexico" },
  { code: "53", label: "🇨🇺 +53 — Cuba" },
  { code: "54", label: "🇦🇷 +54 — Argentina" },
  { code: "55", label: "🇧🇷 +55 — Brazil" },
  { code: "56", label: "🇨🇱 +56 — Chile" },
  { code: "57", label: "🇨🇴 +57 — Colombia" },
  { code: "58", label: "🇻🇪 +58 — Venezuela" },
  { code: "60", label: "🇲🇾 +60 — Malaysia" },
  { code: "61", label: "🇦🇺 +61 — Australia" },
  { code: "62", label: "🇮🇩 +62 — Indonesia" },
  { code: "63", label: "🇵🇭 +63 — Philippines" },
  { code: "64", label: "🇳🇿 +64 — New Zealand" },
  { code: "65", label: "🇸🇬 +65 — Singapore" },
  { code: "66", label: "🇹🇭 +66 — Thailand" },
  { code: "81", label: "🇯🇵 +81 — Japan" },
  { code: "82", label: "🇰🇷 +82 — South Korea" },
  { code: "84", label: "🇻🇳 +84 — Vietnam" },
  { code: "86", label: "🇨🇳 +86 — China" },
  { code: "90", label: "🇹🇷 +90 — Turkey" },
  { code: "91", label: "🇮🇳 +91 — India" },
  { code: "92", label: "🇵🇰 +92 — Pakistan" },
  { code: "93", label: "🇦🇫 +93 — Afghanistan" },
  { code: "94", label: "🇱🇰 +94 — Sri Lanka" },
  { code: "95", label: "🇲🇲 +95 — Myanmar" },
  { code: "98", label: "🇮🇷 +98 — Iran" },
  { code: "212", label: "🇲🇦 +212 — Morocco" },
  { code: "213", label: "🇩🇿 +213 — Algeria" },
  { code: "216", label: "🇹🇳 +216 — Tunisia" },
  { code: "218", label: "🇱🇾 +218 — Libya" },
  { code: "220", label: "🇬🇲 +220 — Gambia" },
  { code: "221", label: "🇸🇳 +221 — Senegal" },
  { code: "222", label: "🇲🇷 +222 — Mauritania" },
  { code: "223", label: "🇲🇱 +223 — Mali" },
  { code: "224", label: "🇬🇳 +224 — Guinea" },
  { code: "225", label: "🇨🇮 +225 — Ivory Coast" },
  { code: "226", label: "🇧🇫 +226 — Burkina Faso" },
  { code: "227", label: "🇳🇪 +227 — Niger" },
  { code: "228", label: "🇹🇬 +228 — Togo" },
  { code: "229", label: "🇧🇯 +229 — Benin" },
  { code: "230", label: "🇲🇺 +230 — Mauritius" },
  { code: "231", label: "🇱🇷 +231 — Liberia" },
  { code: "232", label: "🇸🇱 +232 — Sierra Leone" },
  { code: "233", label: "🇬🇭 +233 — Ghana" },
  { code: "234", label: "🇳🇬 +234 — Nigeria" },
  { code: "235", label: "🇹🇩 +235 — Chad" },
  { code: "236", label: "🇨🇫 +236 — Central African Republic" },
  { code: "237", label: "🇨🇲 +237 — Cameroon" },
  { code: "238", label: "🇨🇻 +238 — Cape Verde" },
  { code: "239", label: "🇸🇹 +239 — São Tomé and Príncipe" },
  { code: "240", label: "🇬🇶 +240 — Equatorial Guinea" },
  { code: "241", label: "🇬🇦 +241 — Gabon" },
  { code: "242", label: "🇨🇬 +242 — Congo" },
  { code: "243", label: "🇨🇩 +243 — DR Congo" },
  { code: "244", label: "🇦🇴 +244 — Angola" },
  { code: "245", label: "🇬🇼 +245 — Guinea-Bissau" },
  { code: "248", label: "🇸🇨 +248 — Seychelles" },
  { code: "249", label: "🇸🇩 +249 — Sudan" },
  { code: "250", label: "🇷🇼 +250 — Rwanda" },
  { code: "251", label: "🇪🇹 +251 — Ethiopia" },
  { code: "252", label: "🇸🇴 +252 — Somalia" },
  { code: "253", label: "🇩🇯 +253 — Djibouti" },
  { code: "254", label: "🇰🇪 +254 — Kenya" },
  { code: "255", label: "🇹🇿 +255 — Tanzania" },
  { code: "256", label: "🇺🇬 +256 — Uganda" },
  { code: "257", label: "🇧🇮 +257 — Burundi" },
  { code: "258", label: "🇲🇿 +258 — Mozambique" },
  { code: "260", label: "🇿🇲 +260 — Zambia" },
  { code: "261", label: "🇲🇬 +261 — Madagascar" },
  { code: "263", label: "🇿🇼 +263 — Zimbabwe" },
  { code: "264", label: "🇳🇦 +264 — Namibia" },
  { code: "265", label: "🇲🇼 +265 — Malawi" },
  { code: "266", label: "🇱🇸 +266 — Lesotho" },
  { code: "267", label: "🇧🇼 +267 — Botswana" },
  { code: "268", label: "🇸🇿 +268 — Eswatini" },
  { code: "269", label: "🇰🇲 +269 — Comoros" },
  { code: "290", label: "🇸🇭 +290 — Saint Helena" },
  { code: "291", label: "🇪🇷 +291 — Eritrea" },
  { code: "297", label: "🇦🇼 +297 — Aruba" },
  { code: "298", label: "🇫🇴 +298 — Faroe Islands" },
  { code: "299", label: "🇬🇱 +299 — Greenland" },
  { code: "350", label: "🇬🇮 +350 — Gibraltar" },
  { code: "351", label: "🇵🇹 +351 — Portugal" },
  { code: "352", label: "🇱🇺 +352 — Luxembourg" },
  { code: "353", label: "🇮🇪 +353 — Ireland" },
  { code: "354", label: "🇮🇸 +354 — Iceland" },
  { code: "355", label: "🇦🇱 +355 — Albania" },
  { code: "356", label: "🇲🇹 +356 — Malta" },
  { code: "357", label: "🇨🇾 +357 — Cyprus" },
  { code: "358", label: "🇫🇮 +358 — Finland" },
  { code: "359", label: "🇧🇬 +359 — Bulgaria" },
  { code: "370", label: "🇱🇹 +370 — Lithuania" },
  { code: "371", label: "🇱🇻 +371 — Latvia" },
  { code: "372", label: "🇪🇪 +372 — Estonia" },
  { code: "373", label: "🇲🇩 +373 — Moldova" },
  { code: "374", label: "🇦🇲 +374 — Armenia" },
  { code: "375", label: "🇧🇾 +375 — Belarus" },
  { code: "376", label: "🇦🇩 +376 — Andorra" },
  { code: "377", label: "🇲🇨 +377 — Monaco" },
  { code: "380", label: "🇺🇦 +380 — Ukraine" },
  { code: "381", label: "🇷🇸 +381 — Serbia" },
  { code: "382", label: "🇲🇪 +382 — Montenegro" },
  { code: "385", label: "🇭🇷 +385 — Croatia" },
  { code: "386", label: "🇸🇮 +386 — Slovenia" },
  { code: "387", label: "🇧🇦 +387 — Bosnia and Herzegovina" },
  { code: "389", label: "🇲🇰 +389 — North Macedonia" },
  { code: "420", label: "🇨🇿 +420 — Czech Republic" },
  { code: "421", label: "🇸🇰 +421 — Slovakia" },
  { code: "423", label: "🇱🇮 +423 — Liechtenstein" },
  { code: "500", label: "🇫🇰 +500 — Falkland Islands" },
  { code: "501", label: "🇧🇿 +501 — Belize" },
  { code: "502", label: "🇬🇹 +502 — Guatemala" },
  { code: "503", label: "🇸🇻 +503 — El Salvador" },
  { code: "504", label: "🇭🇳 +504 — Honduras" },
  { code: "505", label: "🇳🇮 +505 — Nicaragua" },
  { code: "506", label: "🇨🇷 +506 — Costa Rica" },
  { code: "507", label: "🇵🇦 +507 — Panama" },
  { code: "509", label: "🇭🇹 +509 — Haiti" },
  { code: "591", label: "🇧🇴 +591 — Bolivia" },
  { code: "592", label: "🇬🇾 +592 — Guyana" },
  { code: "593", label: "🇪🇨 +593 — Ecuador" },
  { code: "595", label: "🇵🇾 +595 — Paraguay" },
  { code: "597", label: "🇸🇷 +597 — Suriname" },
  { code: "598", label: "🇺🇾 +598 — Uruguay" },
  { code: "673", label: "🇧🇳 +673 — Brunei" },
  { code: "675", label: "🇵🇬 +675 — Papua New Guinea" },
  { code: "676", label: "🇹🇴 +676 — Tonga" },
  { code: "677", label: "🇸🇧 +677 — Solomon Islands" },
  { code: "678", label: "🇻🇺 +678 — Vanuatu" },
  { code: "679", label: "🇫🇯 +679 — Fiji" },
  { code: "680", label: "🇵🇼 +680 — Palau" },
  { code: "685", label: "🇼🇸 +685 — Samoa" },
  { code: "686", label: "🇰🇮 +686 — Kiribati" },
  { code: "687", label: "🇳🇨 +687 — New Caledonia" },
  { code: "689", label: "🇵🇫 +689 — French Polynesia" },
  { code: "850", label: "🇰🇵 +850 — North Korea" },
  { code: "852", label: "🇭🇰 +852 — Hong Kong" },
  { code: "853", label: "🇲🇴 +853 — Macau" },
  { code: "855", label: "🇰🇭 +855 — Cambodia" },
  { code: "856", label: "🇱🇦 +856 — Laos" },
  { code: "880", label: "🇧🇩 +880 — Bangladesh" },
  { code: "886", label: "🇹🇼 +886 — Taiwan" },
  { code: "960", label: "🇲🇻 +960 — Maldives" },
  { code: "961", label: "🇱🇧 +961 — Lebanon" },
  { code: "962", label: "🇯🇴 +962 — Jordan" },
  { code: "963", label: "🇸🇾 +963 — Syria" },
  { code: "964", label: "🇮🇶 +964 — Iraq" },
  { code: "965", label: "🇰🇼 +965 — Kuwait" },
  { code: "966", label: "🇸🇦 +966 — Saudi Arabia" },
  { code: "967", label: "🇾🇪 +967 — Yemen" },
  { code: "968", label: "🇴🇲 +968 — Oman" },
  { code: "970", label: "🇵🇸 +970 — Palestine" },
  { code: "971", label: "🇦🇪 +971 — UAE" },
  { code: "972", label: "🇮🇱 +972 — Israel" },
  { code: "973", label: "🇧🇭 +973 — Bahrain" },
  { code: "974", label: "🇶🇦 +974 — Qatar" },
  { code: "975", label: "🇧🇹 +975 — Bhutan" },
  { code: "976", label: "🇲🇳 +976 — Mongolia" },
  { code: "977", label: "🇳🇵 +977 — Nepal" },
  { code: "992", label: "🇹🇯 +992 — Tajikistan" },
  { code: "993", label: "🇹🇲 +993 — Turkmenistan" },
  { code: "994", label: "🇦🇿 +994 — Azerbaijan" },
  { code: "995", label: "🇬🇪 +995 — Georgia" },
  { code: "996", label: "🇰🇬 +996 — Kyrgyzstan" },
  { code: "998", label: "🇺🇿 +998 — Uzbekistan" },
];

export default function Command() {
  const { defaultCountryCode } = getPreferenceValues<Preferences>();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState(defaultCountryCode ?? "");
  const [phoneError, setPhoneError] = useState<string | undefined>();

  async function handleSubmit() {
    const digits = normalizeNumber(phoneNumber, countryCode);

    if (!digits) {
      setPhoneError("Invalid number — must resolve to 8–15 digits.");
      return;
    }

    const url = buildWhatsAppUrl(digits);
    await Clipboard.copy(url);
    await open(url);
    await showHUD("WhatsApp link copied and opened");
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Open WhatsApp" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="phoneNumber"
        title="Phone Number"
        placeholder="+55 11 91234-5678 or 11912345678"
        value={phoneNumber}
        onChange={(v) => {
          setPhoneNumber(v);
          setPhoneError(undefined);
        }}
        error={phoneError}
        autoFocus
      />
      <Form.Dropdown id="countryCode" title="Country Code" value={countryCode} onChange={setCountryCode}>
        {COUNTRY_CODES.map(({ code, label }) => (
          <Form.Dropdown.Item key={code} value={code} title={label} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
