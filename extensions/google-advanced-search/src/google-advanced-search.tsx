import { Action, ActionPanel, Clipboard, Form, Icon, Toast, closeMainWindow, open, showToast } from "@raycast/api";

type Option = {
  value: string;
  title: string;
};

const languages: Option[] = [
  { value: "", title: "any language" },
  { value: "lang_af", title: "Afrikaans" },
  { value: "lang_ar", title: "Arabic" },
  { value: "lang_hy", title: "Armenian" },
  { value: "lang_be", title: "Belarusian" },
  { value: "lang_bg", title: "Bulgarian" },
  { value: "lang_ca", title: "Catalan" },
  { value: "lang_zh-CN", title: "Chinese (Simplified)" },
  { value: "lang_zh-TW", title: "Chinese (Traditional)" },
  { value: "lang_hr", title: "Croatian" },
  { value: "lang_cs", title: "Czech" },
  { value: "lang_da", title: "Danish" },
  { value: "lang_nl", title: "Dutch" },
  { value: "lang_en", title: "English" },
  { value: "lang_eo", title: "Esperanto" },
  { value: "lang_et", title: "Estonian" },
  { value: "lang_tl", title: "Filipino" },
  { value: "lang_fi", title: "Finnish" },
  { value: "lang_fr", title: "French" },
  { value: "lang_de", title: "German" },
  { value: "lang_el", title: "Greek" },
  { value: "lang_iw", title: "Hebrew" },
  { value: "lang_hi", title: "Hindi" },
  { value: "lang_hu", title: "Hungarian" },
  { value: "lang_is", title: "Icelandic" },
  { value: "lang_id", title: "Indonesian" },
  { value: "lang_it", title: "Italian" },
  { value: "lang_ja", title: "Japanese" },
  { value: "lang_ko", title: "Korean" },
  { value: "lang_lv", title: "Latvian" },
  { value: "lang_lt", title: "Lithuanian" },
  { value: "lang_no", title: "Norwegian" },
  { value: "lang_fa", title: "Persian" },
  { value: "lang_pl", title: "Polish" },
  { value: "lang_pt", title: "Portuguese" },
  { value: "lang_ro", title: "Romanian" },
  { value: "lang_ru", title: "Russian" },
  { value: "lang_sr", title: "Serbian" },
  { value: "lang_sk", title: "Slovak" },
  { value: "lang_sl", title: "Slovenian" },
  { value: "lang_es", title: "Spanish" },
  { value: "lang_sw", title: "Swahili" },
  { value: "lang_sv", title: "Swedish" },
  { value: "lang_th", title: "Thai" },
  { value: "lang_tr", title: "Turkish" },
  { value: "lang_uk", title: "Ukrainian" },
  { value: "lang_vi", title: "Vietnamese" },
];

const regions: Option[] = [
  { value: "", title: "any region" },
  { value: "countryAF", title: "Afghanistan" },
  { value: "countryAL", title: "Albania" },
  { value: "countryDZ", title: "Algeria" },
  { value: "countryAS", title: "American Samoa" },
  { value: "countryAD", title: "Andorra" },
  { value: "countryAO", title: "Angola" },
  { value: "countryAI", title: "Anguilla" },
  { value: "countryAQ", title: "Antarctica" },
  { value: "countryAG", title: "Antigua & Barbuda" },
  { value: "countryAR", title: "Argentina" },
  { value: "countryAM", title: "Armenia" },
  { value: "countryAW", title: "Aruba" },
  { value: "countryAU", title: "Australia" },
  { value: "countryAT", title: "Austria" },
  { value: "countryAZ", title: "Azerbaijan" },
  { value: "countryBS", title: "Bahamas" },
  { value: "countryBH", title: "Bahrain" },
  { value: "countryBD", title: "Bangladesh" },
  { value: "countryBB", title: "Barbados" },
  { value: "countryBY", title: "Belarus" },
  { value: "countryBE", title: "Belgium" },
  { value: "countryBZ", title: "Belize" },
  { value: "countryBJ", title: "Benin" },
  { value: "countryBM", title: "Bermuda" },
  { value: "countryBT", title: "Bhutan" },
  { value: "countryBO", title: "Bolivia" },
  { value: "countryBA", title: "Bosnia & Herzegovina" },
  { value: "countryBW", title: "Botswana" },
  { value: "countryBV", title: "Bouvet Island" },
  { value: "countryBR", title: "Brazil" },
  { value: "countryIO", title: "British Indian Ocean Territory" },
  { value: "countryVG", title: "British Virgin Islands" },
  { value: "countryBN", title: "Brunei" },
  { value: "countryBG", title: "Bulgaria" },
  { value: "countryBF", title: "Burkina Faso" },
  { value: "countryBI", title: "Burundi" },
  { value: "countryKH", title: "Cambodia" },
  { value: "countryCM", title: "Cameroon" },
  { value: "countryCA", title: "Canada" },
  { value: "countryCV", title: "Cape Verde" },
  { value: "countryKY", title: "Cayman Islands" },
  { value: "countryCF", title: "Central African Republic" },
  { value: "countryTD", title: "Chad" },
  { value: "countryCL", title: "Chile" },
  { value: "countryCN", title: "China" },
  { value: "countryCX", title: "Christmas Island" },
  { value: "countryCC", title: "Cocos (Keeling) Islands" },
  { value: "countryCO", title: "Colombia" },
  { value: "countryKM", title: "Comoros" },
  { value: "countryCG", title: "Congo - Brazzaville" },
  { value: "countryCD", title: "Congo - Kinshasa" },
  { value: "countryCK", title: "Cook Islands" },
  { value: "countryCR", title: "Costa Rica" },
  { value: "countryCI", title: "Côte d’Ivoire" },
  { value: "countryHR", title: "Croatia" },
  { value: "countryCU", title: "Cuba" },
  { value: "countryCY", title: "Cyprus" },
  { value: "countryCZ", title: "Czechia" },
  { value: "countryDK", title: "Denmark" },
  { value: "countryDJ", title: "Djibouti" },
  { value: "countryDM", title: "Dominica" },
  { value: "countryDO", title: "Dominican Republic" },
  { value: "countryEC", title: "Ecuador" },
  { value: "countryEG", title: "Egypt" },
  { value: "countrySV", title: "El Salvador" },
  { value: "countryGQ", title: "Equatorial Guinea" },
  { value: "countryER", title: "Eritrea" },
  { value: "countryEE", title: "Estonia" },
  { value: "countrySZ", title: "Eswatini" },
  { value: "countryET", title: "Ethiopia" },
  { value: "countryFK", title: "Falkland Islands (Islas Malvinas)" },
  { value: "countryFO", title: "Faroe Islands" },
  { value: "countryFJ", title: "Fiji" },
  { value: "countryFI", title: "Finland" },
  { value: "countryFR", title: "France" },
  { value: "countryGF", title: "French Guiana" },
  { value: "countryPF", title: "French Polynesia" },
  { value: "countryTF", title: "French Southern Territories" },
  { value: "countryGA", title: "Gabon" },
  { value: "countryGM", title: "Gambia" },
  { value: "countryGE", title: "Georgia" },
  { value: "countryDE", title: "Germany" },
  { value: "countryGH", title: "Ghana" },
  { value: "countryGI", title: "Gibraltar" },
  { value: "countryGR", title: "Greece" },
  { value: "countryGL", title: "Greenland" },
  { value: "countryGD", title: "Grenada" },
  { value: "countryGP", title: "Guadeloupe" },
  { value: "countryGU", title: "Guam" },
  { value: "countryGT", title: "Guatemala" },
  { value: "countryGN", title: "Guinea" },
  { value: "countryGW", title: "Guinea-Bissau" },
  { value: "countryGY", title: "Guyana" },
  { value: "countryHT", title: "Haiti" },
  { value: "countryHM", title: "Heard & McDonald Islands" },
  { value: "countryHN", title: "Honduras" },
  { value: "countryHK", title: "Hong Kong" },
  { value: "countryHU", title: "Hungary" },
  { value: "countryIS", title: "Iceland" },
  { value: "countryIN", title: "India" },
  { value: "countryID", title: "Indonesia" },
  { value: "countryIR", title: "Iran" },
  { value: "countryIQ", title: "Iraq" },
  { value: "countryIE", title: "Ireland" },
  { value: "countryIL", title: "Israel" },
  { value: "countryIT", title: "Italy" },
  { value: "countryJM", title: "Jamaica" },
  { value: "countryJP", title: "Japan" },
  { value: "countryJO", title: "Jordan" },
  { value: "countryKZ", title: "Kazakhstan" },
  { value: "countryKE", title: "Kenya" },
  { value: "countryKI", title: "Kiribati" },
  { value: "countryKW", title: "Kuwait" },
  { value: "countryKG", title: "Kyrgyzstan" },
  { value: "countryLA", title: "Laos" },
  { value: "countryLV", title: "Latvia" },
  { value: "countryLB", title: "Lebanon" },
  { value: "countryLS", title: "Lesotho" },
  { value: "countryLR", title: "Liberia" },
  { value: "countryLY", title: "Libya" },
  { value: "countryLI", title: "Liechtenstein" },
  { value: "countryLT", title: "Lithuania" },
  { value: "countryLU", title: "Luxembourg" },
  { value: "countryMO", title: "Macao" },
  { value: "countryMG", title: "Madagascar" },
  { value: "countryMW", title: "Malawi" },
  { value: "countryMY", title: "Malaysia" },
  { value: "countryMV", title: "Maldives" },
  { value: "countryML", title: "Mali" },
  { value: "countryMT", title: "Malta" },
  { value: "countryMH", title: "Marshall Islands" },
  { value: "countryMQ", title: "Martinique" },
  { value: "countryMR", title: "Mauritania" },
  { value: "countryMU", title: "Mauritius" },
  { value: "countryYT", title: "Mayotte" },
  { value: "countryMX", title: "Mexico" },
  { value: "countryFM", title: "Micronesia" },
  { value: "countryMD", title: "Moldova" },
  { value: "countryMC", title: "Monaco" },
  { value: "countryMN", title: "Mongolia" },
  { value: "countryMS", title: "Montserrat" },
  { value: "countryMA", title: "Morocco" },
  { value: "countryMZ", title: "Mozambique" },
  { value: "countryMM", title: "Myanmar (Burma)" },
  { value: "countryNA", title: "Namibia" },
  { value: "countryNR", title: "Nauru" },
  { value: "countryNP", title: "Nepal" },
  { value: "countryNL", title: "Netherlands" },
  { value: "countryNC", title: "New Caledonia" },
  { value: "countryNZ", title: "New Zealand" },
  { value: "countryNI", title: "Nicaragua" },
  { value: "countryNE", title: "Niger" },
  { value: "countryNG", title: "Nigeria" },
  { value: "countryNU", title: "Niue" },
  { value: "countryNF", title: "Norfolk Island" },
  { value: "countryKP", title: "North Korea" },
  { value: "countryMK", title: "North Macedonia" },
  { value: "countryMP", title: "Northern Mariana Islands" },
  { value: "countryNO", title: "Norway" },
  { value: "countryOM", title: "Oman" },
  { value: "countryPK", title: "Pakistan" },
  { value: "countryPW", title: "Palau" },
  { value: "countryPS", title: "Palestine" },
  { value: "countryPA", title: "Panama" },
  { value: "countryPG", title: "Papua New Guinea" },
  { value: "countryPY", title: "Paraguay" },
  { value: "countryPE", title: "Peru" },
  { value: "countryPH", title: "Philippines" },
  { value: "countryPN", title: "Pitcairn Islands" },
  { value: "countryPL", title: "Poland" },
  { value: "countryPT", title: "Portugal" },
  { value: "countryPR", title: "Puerto Rico" },
  { value: "countryQA", title: "Qatar" },
  { value: "countryRE", title: "Réunion" },
  { value: "countryRO", title: "Romania" },
  { value: "countryRU", title: "Russia" },
  { value: "countryRW", title: "Rwanda" },
  { value: "countryWS", title: "Samoa" },
  { value: "countrySM", title: "San Marino" },
  { value: "countryST", title: "São Tomé & Príncipe" },
  { value: "countrySA", title: "Saudi Arabia" },
  { value: "countrySN", title: "Senegal" },
  { value: "countryRS", title: "Serbia" },
  { value: "countrySC", title: "Seychelles" },
  { value: "countrySL", title: "Sierra Leone" },
  { value: "countrySG", title: "Singapore" },
  { value: "countrySK", title: "Slovakia" },
  { value: "countrySI", title: "Slovenia" },
  { value: "countrySB", title: "Solomon Islands" },
  { value: "countrySO", title: "Somalia" },
  { value: "countryZA", title: "South Africa" },
  { value: "countryGS", title: "South Georgia & South Sandwich Islands" },
  { value: "countryKR", title: "South Korea" },
  { value: "countryES", title: "Spain" },
  { value: "countryLK", title: "Sri Lanka" },
  { value: "countrySH", title: "St. Helena" },
  { value: "countryKN", title: "St. Kitts & Nevis" },
  { value: "countryLC", title: "St. Lucia" },
  { value: "countryPM", title: "St. Pierre & Miquelon" },
  { value: "countryVC", title: "St. Vincent & Grenadines" },
  { value: "countrySD", title: "Sudan" },
  { value: "countrySR", title: "Suriname" },
  { value: "countrySJ", title: "Svalbard & Jan Mayen" },
  { value: "countrySE", title: "Sweden" },
  { value: "countryCH", title: "Switzerland" },
  { value: "countrySY", title: "Syria" },
  { value: "countryTW", title: "Taiwan" },
  { value: "countryTJ", title: "Tajikistan" },
  { value: "countryTZ", title: "Tanzania" },
  { value: "countryTH", title: "Thailand" },
  { value: "countryTG", title: "Togo" },
  { value: "countryTK", title: "Tokelau" },
  { value: "countryTO", title: "Tonga" },
  { value: "countryTT", title: "Trinidad & Tobago" },
  { value: "countryTN", title: "Tunisia" },
  { value: "countryTR", title: "Türkiye" },
  { value: "countryTM", title: "Turkmenistan" },
  { value: "countryTC", title: "Turks & Caicos Islands" },
  { value: "countryTV", title: "Tuvalu" },
  { value: "countryUM", title: "U.S. Outlying Islands" },
  { value: "countryVI", title: "U.S. Virgin Islands" },
  { value: "countryUG", title: "Uganda" },
  { value: "countryUA", title: "Ukraine" },
  { value: "countryAE", title: "United Arab Emirates" },
  { value: "countryGB", title: "United Kingdom" },
  { value: "countryUS", title: "United States" },
  { value: "countryUY", title: "Uruguay" },
  { value: "countryUZ", title: "Uzbekistan" },
  { value: "countryVU", title: "Vanuatu" },
  { value: "countryVA", title: "Vatican City" },
  { value: "countryVE", title: "Venezuela" },
  { value: "countryVN", title: "Vietnam" },
  { value: "countryWF", title: "Wallis & Futuna" },
  { value: "countryEH", title: "Western Sahara" },
  { value: "countryYE", title: "Yemen" },
  { value: "countryZM", title: "Zambia" },
  { value: "countryZW", title: "Zimbabwe" },
];

type SearchParams = {
  as_epq: string;
  as_eq: string;
  as_filetype: string;
  as_nhi: string;
  as_nlo: string;
  as_occt: string;
  as_oq: string;
  as_q: string;
  as_qdr: string;
  as_rights: string;
  as_sitesearch: string;
  cr: string;
  lr: string;
};

const queryFields = ["as_q", "as_epq", "as_oq", "as_eq", "as_sitesearch"] as const;

function hasQuery(values: SearchParams): boolean {
  return queryFields.some((field) => values[field].trim().length > 0);
}

function buildSearchUrl(values: SearchParams): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(values)) {
    if (value) {
      searchParams.append(key, value);
    }
  }

  return `https://www.google.com/search?${searchParams.toString()}`;
}

async function showMissingQuery(): Promise<void> {
  await showToast({ style: Toast.Style.Failure, title: "Add a word or a site" });
}

async function search(values: SearchParams): Promise<void> {
  if (!hasQuery(values)) {
    await showMissingQuery();
    return;
  }

  await closeMainWindow();
  await open(buildSearchUrl(values));
}

async function copyLink(values: SearchParams): Promise<void> {
  if (!hasQuery(values)) {
    await showMissingQuery();
    return;
  }

  await Clipboard.copy(buildSearchUrl(values));
  await showToast({ style: Toast.Style.Success, title: "Link copied" });
}

export default function Command() {
  return (
    <Form
      navigationTitle="Google Advanced Search"
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Globe} title="Search" onSubmit={search} />
          <Action.SubmitForm icon={Icon.Clipboard} title="Copy Link" onSubmit={copyLink} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Word Search"
        text="Specify keywords to include, exact phrases, optional words, and exclusions to streamline your search."
      />

      <Form.TextField
        id="as_q"
        title="All These Words"
        info="Enter all the words that must appear in the search results. E.g.: electric car reviews"
      />

      <Form.TextField
        id="as_epq"
        title="This Exact Phrase"
        info="Enter an exact phrase that must be found in the results. E.g.: climate change legislation"
      />

      <Form.TextField
        id="as_oq"
        title="Any of These Words"
        info="Enter words, any of which you're interested in finding within the results. E.g.: iPhone Samsung smartphone"
      />

      <Form.TextField
        id="as_eq"
        title="None of These Words"
        info="List words you want to exclude from your search, helping to eliminate unwanted terms. E.g.: nuts dairy shellfish"
      />

      <Form.Separator />

      <Form.Description
        title="Numeric Range"
        text="Set minimum and maximum numeric limits, such as price or date, to narrow down search results."
      />

      <Form.TextField
        id="as_nlo"
        title="Numbers Ranging from"
        info="Set the start of a numerical range for your search. You can add a unit of measurement: 2022, $100, 10 kg"
      />

      <Form.TextField
        id="as_nhi"
        title="Numbers Ranging to"
        info="Set the end of a numerical range for your search. You can add a unit of measurement: 2024, $300, 35 kg"
      />

      <Form.Separator />

      <Form.Description
        title="Search Filters"
        text="Filter results by language, region, site, last update or format to customize search outcomes."
      />

      <Form.Dropdown id="lr" title="Language" defaultValue="" info="Find pages in the language that you select.">
        {languages.map((language) => (
          <Form.Dropdown.Item key={language.value || language.title} value={language.value} title={language.title} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id="cr" title="Region" defaultValue="" info="Find pages published in a particular region.">
        {regions.map((region) => (
          <Form.Dropdown.Item key={region.value || region.title} value={region.value} title={region.title} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="as_qdr"
        title="Last Update"
        defaultValue="all"
        info="Find pages updated within the time that you specify."
      >
        <Form.Dropdown.Item value="all" title="anytime" />
        <Form.Dropdown.Item value="d" title="past 24 hours" />
        <Form.Dropdown.Item value="w" title="past week" />
        <Form.Dropdown.Item value="m" title="past month" />
        <Form.Dropdown.Item value="y" title="past year" />
      </Form.Dropdown>

      <Form.TextField
        id="as_sitesearch"
        title="Site or Domain"
        info="Search one site (like wikipedia.org ) or limit your results to a domain like .edu, .org or .gov"
      />

      <Form.Dropdown
        id="as_occt"
        title="Terms Appearing"
        defaultValue=""
        info="Search for terms in the whole page, page title or web address, or links to the page you're looking for."
      >
        <Form.Dropdown.Item value="" title="anywhere in the page" />
        <Form.Dropdown.Item value="title" title="in the title of the page" />
        <Form.Dropdown.Item value="body" title="in the text of the page" />
        <Form.Dropdown.Item value="url" title="in the URL of the page" />
        <Form.Dropdown.Item value="links" title="in links to the page" />
      </Form.Dropdown>

      <Form.Dropdown
        id="as_filetype"
        title="File Type"
        defaultValue=""
        info="Find pages in the format that you prefer."
      >
        <Form.Dropdown.Item value="" title="any format" />
        <Form.Dropdown.Item value="pdf" title="Adobe Acrobat PDF (.pdf)" />
        <Form.Dropdown.Item value="ps" title="Adobe Postscript (.ps)" />
        <Form.Dropdown.Item value="dwf" title="Autodesk DWF (.dwf)" />
        <Form.Dropdown.Item value="kml" title="Google Earth KML (.kml)" />
        <Form.Dropdown.Item value="kmz" title="Google Earth KMZ (.kmz)" />
        <Form.Dropdown.Item value="xls" title="Microsoft Excel (.xls)" />
        <Form.Dropdown.Item value="ppt" title="Microsoft PowerPoint (.ppt)" />
        <Form.Dropdown.Item value="doc" title="Microsoft Word (.doc)" />
        <Form.Dropdown.Item value="rtf" title="Rich Text Format (.rtf)" />
        <Form.Dropdown.Item value="swf" title="Shockwave Flash (.swf)" />
      </Form.Dropdown>

      <Form.Dropdown
        id="as_rights"
        title="Usage Rights"
        defaultValue=""
        info="Find pages that you are free to use yourself."
      >
        <Form.Dropdown.Item value="" title="not filtered by licence" />
        <Form.Dropdown.Item
          value="(cc_publicdomain|cc_attribute|cc_sharealike|cc_noncommercial|cc_nonderived)"
          title="free to use or share"
        />
        <Form.Dropdown.Item
          value="(cc_publicdomain|cc_attribute|cc_sharealike|cc_nonderived).-(cc_noncommercial)"
          title="free to use or share, even commercially"
        />
        <Form.Dropdown.Item
          value="(cc_publicdomain|cc_attribute|cc_sharealike|cc_noncommercial).-(cc_nonderived)"
          title="free to use share or modify"
        />
        <Form.Dropdown.Item
          value="(cc_publicdomain|cc_attribute|cc_sharealike).-(cc_noncommercial|cc_nonderived)"
          title="free to use, share or modify, even commercially"
        />
      </Form.Dropdown>
    </Form>
  );
}
