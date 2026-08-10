import { Action, ActionPanel, Form, Icon, open } from "@raycast/api";

type SearchParams = {
  as_epq: string;
  as_eq: string;
  as_filetype: string;
  as_nhi: string;
  as_nlo: string;
  as_occt_input: string;
  as_oq: string;
  as_q: string;
  as_qdr: string;
  as_sitesearch: string;
  cr: string;
  lr: string;
  sur: string;
};

function buildSearchUrl(values: SearchParams): string {
  const searchParams = new URLSearchParams();

  Object.keys(values).forEach((key) => {
    const value = values[key as keyof SearchParams];
    searchParams.append(key, value);
  });

  return `https://www.google.com/search?${searchParams.toString()}`;
}

function OpenSearchInBrowserAction() {
  async function handleSubmit(values: SearchParams) {
    const url = buildSearchUrl(values);
    open(url);
  }

  return <Action.SubmitForm icon={Icon.Globe} title="Search" onSubmit={handleSubmit} />;
}

export default function Command() {
  return (
    <Form
      navigationTitle="Google Advanced Search"
      actions={
        <ActionPanel>
          <OpenSearchInBrowserAction />
        </ActionPanel>
      }
    >
      {/* WORD SEARCH */}

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

      {/* NUMERIC RANGE */}

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

      {/* SEARCH FILTERS */}

      <Form.Description
        title="Search Filters"
        text="Filter results by language, region, site, last update or format to customize search outcomes."
      />

      <Form.Dropdown id="lr" title="Language" defaultValue="" info="Find pages in the language that you select.">
        <Form.Dropdown.Item value="" title="any language" />
        <Form.Dropdown.Item value="lang_af" title="Afrikaans" />
        <Form.Dropdown.Item value="lang_ar" title="Arabic" />
        <Form.Dropdown.Item value="lang_hy" title="Armenian" />
        <Form.Dropdown.Item value="lang_be" title="Belarusian" />
        <Form.Dropdown.Item value="lang_bg" title="Bulgarian" />
        <Form.Dropdown.Item value="lang_ca" title="Catalan" />
        <Form.Dropdown.Item value="lang_zh-CN" title="Chinese (Simplified)" />
        <Form.Dropdown.Item value="lang_zh-TW" title="Chinese (Traditional)" />
        <Form.Dropdown.Item value="lang_hr" title="Croatian" />
        <Form.Dropdown.Item value="lang_cs" title="Czech" />
        <Form.Dropdown.Item value="lang_da" title="Danish" />
        <Form.Dropdown.Item value="lang_nl" title="Dutch" />
        <Form.Dropdown.Item value="lang_en" title="English" />
        <Form.Dropdown.Item value="lang_eo" title="Esperanto" />
        <Form.Dropdown.Item value="lang_et" title="Estonian" />
        <Form.Dropdown.Item value="lang_tl" title="Filipino" />
        <Form.Dropdown.Item value="lang_fi" title="Finnish" />
        <Form.Dropdown.Item value="lang_fr" title="French" />
        <Form.Dropdown.Item value="lang_de" title="German" />
        <Form.Dropdown.Item value="lang_el" title="Greek" />
        <Form.Dropdown.Item value="lang_iw" title="Hebrew" />
        <Form.Dropdown.Item value="lang_hi" title="Hindi" />
        <Form.Dropdown.Item value="lang_hu" title="Hungarian" />
        <Form.Dropdown.Item value="lang_is" title="Icelandic" />
        <Form.Dropdown.Item value="lang_id" title="Indonesian" />
        <Form.Dropdown.Item value="lang_it" title="Italian" />
        <Form.Dropdown.Item value="lang_ja" title="Japanese" />
        <Form.Dropdown.Item value="lang_ko" title="Korean" />
        <Form.Dropdown.Item value="lang_lv" title="Latvian" />
        <Form.Dropdown.Item value="lang_lt" title="Lithuanian" />
        <Form.Dropdown.Item value="lang_no" title="Norwegian" />
        <Form.Dropdown.Item value="lang_fa" title="Persian" />
        <Form.Dropdown.Item value="lang_pl" title="Polish" />
        <Form.Dropdown.Item value="lang_pt" title="Portuguese" />
        <Form.Dropdown.Item value="lang_ro" title="Romanian" />
        <Form.Dropdown.Item value="lang_ru" title="Russian" />
        <Form.Dropdown.Item value="lang_sr" title="Serbian" />
        <Form.Dropdown.Item value="lang_sk" title="Slovak" />
        <Form.Dropdown.Item value="lang_sl" title="Slovenian" />
        <Form.Dropdown.Item value="lang_es" title="Spanish" />
        <Form.Dropdown.Item value="lang_sw" title="Swahili" />
        <Form.Dropdown.Item value="lang_sv" title="Swedish" />
        <Form.Dropdown.Item value="lang_th" title="Thai" />
        <Form.Dropdown.Item value="lang_tr" title="Turkish" />
        <Form.Dropdown.Item value="lang_uk" title="Ukrainian" />
        <Form.Dropdown.Item value="lang_vi" title="Vietnamese" />
      </Form.Dropdown>

      <Form.Dropdown id="cr" title="Region" defaultValue="" info="Find pages published in a particular region.">
        <Form.Dropdown.Item value="" title="any region" />
        <Form.Dropdown.Item value="countryAF" title="Afghanistan" />
        <Form.Dropdown.Item value="countryAL" title="Albania" />
        <Form.Dropdown.Item value="countryDZ" title="Algeria" />
        <Form.Dropdown.Item value="countryAS" title="American Samoa" />
        <Form.Dropdown.Item value="countryAD" title="Andorra" />
        <Form.Dropdown.Item value="countryAO" title="Angola" />
        <Form.Dropdown.Item value="countryAI" title="Anguilla" />
        <Form.Dropdown.Item value="countryAQ" title="Antarctica" />
        <Form.Dropdown.Item value="countryAG" title="Antigua &amp; Barbuda" />
        <Form.Dropdown.Item value="countryAR" title="Argentina" />
        <Form.Dropdown.Item value="countryAM" title="Armenia" />
        <Form.Dropdown.Item value="countryAW" title="Aruba" />
        <Form.Dropdown.Item value="countryAU" title="Australia" />
        <Form.Dropdown.Item value="countryAT" title="Austria" />
        <Form.Dropdown.Item value="countryAZ" title="Azerbaijan" />
        <Form.Dropdown.Item value="countryBS" title="Bahamas" />
        <Form.Dropdown.Item value="countryBH" title="Bahrain" />
        <Form.Dropdown.Item value="countryBD" title="Bangladesh" />
        <Form.Dropdown.Item value="countryBB" title="Barbados" />
        <Form.Dropdown.Item value="countryBY" title="Belarus" />
        <Form.Dropdown.Item value="countryBE" title="Belgium" />
        <Form.Dropdown.Item value="countryBZ" title="Belize" />
        <Form.Dropdown.Item value="countryBJ" title="Benin" />
        <Form.Dropdown.Item value="countryBM" title="Bermuda" />
        <Form.Dropdown.Item value="countryBT" title="Bhutan" />
        <Form.Dropdown.Item value="countryBO" title="Bolivia" />
        <Form.Dropdown.Item value="countryBA" title="Bosnia &amp; Herzegovina" />
        <Form.Dropdown.Item value="countryBW" title="Botswana" />
        <Form.Dropdown.Item value="countryBV" title="Bouvet Island" />
        <Form.Dropdown.Item value="countryBR" title="Brazil" />
        <Form.Dropdown.Item value="countryIO" title="British Indian Ocean Territory" />
        <Form.Dropdown.Item value="countryVG" title="British Virgin Islands" />
        <Form.Dropdown.Item value="countryBN" title="Brunei" />
        <Form.Dropdown.Item value="countryBG" title="Bulgaria" />
        <Form.Dropdown.Item value="countryBF" title="Burkina Faso" />
        <Form.Dropdown.Item value="countryBI" title="Burundi" />
        <Form.Dropdown.Item value="countryKH" title="Cambodia" />
        <Form.Dropdown.Item value="countryCM" title="Cameroon" />
        <Form.Dropdown.Item value="countryCA" title="Canada" />
        <Form.Dropdown.Item value="countryCV" title="Cape Verde" />
        <Form.Dropdown.Item value="countryKY" title="Cayman Islands" />
        <Form.Dropdown.Item value="countryCF" title="Central African Republic" />
        <Form.Dropdown.Item value="countryTD" title="Chad" />
        <Form.Dropdown.Item value="countryCL" title="Chile" />
        <Form.Dropdown.Item value="countryCN" title="China" />
        <Form.Dropdown.Item value="countryCX" title="Christmas Island" />
        <Form.Dropdown.Item value="countryCC" title="Cocos (Keeling) Islands" />
        <Form.Dropdown.Item value="countryCO" title="Colombia" />
        <Form.Dropdown.Item value="countryKM" title="Comoros" />
        <Form.Dropdown.Item value="countryCG" title="Congo - Brazzaville" />
        <Form.Dropdown.Item value="countryCD" title="Congo - Kinshasa" />
        <Form.Dropdown.Item value="countryCK" title="Cook Islands" />
        <Form.Dropdown.Item value="countryCR" title="Costa Rica" />
        <Form.Dropdown.Item value="countryCI" title="Côte d’Ivoire" />
        <Form.Dropdown.Item value="countryHR" title="Croatia" />
        <Form.Dropdown.Item value="countryCU" title="Cuba" />
        <Form.Dropdown.Item value="countryCY" title="Cyprus" />
        <Form.Dropdown.Item value="countryCZ" title="Czechia" />
        <Form.Dropdown.Item value="countryDK" title="Denmark" />
        <Form.Dropdown.Item value="countryDJ" title="Djibouti" />
        <Form.Dropdown.Item value="countryDM" title="Dominica" />
        <Form.Dropdown.Item value="countryDO" title="Dominican Republic" />
        <Form.Dropdown.Item value="countryEC" title="Ecuador" />
        <Form.Dropdown.Item value="countryEG" title="Egypt" />
        <Form.Dropdown.Item value="countrySV" title="El Salvador" />
        <Form.Dropdown.Item value="countryGQ" title="Equatorial Guinea" />
        <Form.Dropdown.Item value="countryER" title="Eritrea" />
        <Form.Dropdown.Item value="countryEE" title="Estonia" />
        <Form.Dropdown.Item value="countrySZ" title="Eswatini" />
        <Form.Dropdown.Item value="countryET" title="Ethiopia" />
        <Form.Dropdown.Item value="countryFK" title="Falkland Islands (Islas Malvinas)" />
        <Form.Dropdown.Item value="countryFO" title="Faroe Islands" />
        <Form.Dropdown.Item value="countryFJ" title="Fiji" />
        <Form.Dropdown.Item value="countryFI" title="Finland" />
        <Form.Dropdown.Item value="countryFR" title="France" />
        <Form.Dropdown.Item value="countryGF" title="French Guiana" />
        <Form.Dropdown.Item value="countryPF" title="French Polynesia" />
        <Form.Dropdown.Item value="countryTF" title="French Southern Territories" />
        <Form.Dropdown.Item value="countryGA" title="Gabon" />
        <Form.Dropdown.Item value="countryGM" title="Gambia" />
        <Form.Dropdown.Item value="countryGE" title="Georgia" />
        <Form.Dropdown.Item value="countryDE" title="Germany" />
        <Form.Dropdown.Item value="countryGH" title="Ghana" />
        <Form.Dropdown.Item value="countryGI" title="Gibraltar" />
        <Form.Dropdown.Item value="countryGR" title="Greece" />
        <Form.Dropdown.Item value="countryGL" title="Greenland" />
        <Form.Dropdown.Item value="countryGD" title="Grenada" />
        <Form.Dropdown.Item value="countryGP" title="Guadeloupe" />
        <Form.Dropdown.Item value="countryGU" title="Guam" />
        <Form.Dropdown.Item value="countryGT" title="Guatemala" />
        <Form.Dropdown.Item value="countryGN" title="Guinea" />
        <Form.Dropdown.Item value="countryGW" title="Guinea-Bissau" />
        <Form.Dropdown.Item value="countryGY" title="Guyana" />
        <Form.Dropdown.Item value="countryHT" title="Haiti" />
        <Form.Dropdown.Item value="countryHM" title="Heard &amp; McDonald Islands" />
        <Form.Dropdown.Item value="countryHN" title="Honduras" />
        <Form.Dropdown.Item value="countryHK" title="Hong Kong" />
        <Form.Dropdown.Item value="countryHU" title="Hungary" />
        <Form.Dropdown.Item value="countryIS" title="Iceland" />
        <Form.Dropdown.Item value="countryIN" title="India" />
        <Form.Dropdown.Item value="countryID" title="Indonesia" />
        <Form.Dropdown.Item value="countryIR" title="Iran" />
        <Form.Dropdown.Item value="countryIQ" title="Iraq" />
        <Form.Dropdown.Item value="countryIE" title="Ireland" />
        <Form.Dropdown.Item value="countryIL" title="Israel" />
        <Form.Dropdown.Item value="countryIT" title="Italy" />
        <Form.Dropdown.Item value="countryJM" title="Jamaica" />
        <Form.Dropdown.Item value="countryJP" title="Japan" />
        <Form.Dropdown.Item value="countryJO" title="Jordan" />
        <Form.Dropdown.Item value="countryKZ" title="Kazakhstan" />
        <Form.Dropdown.Item value="countryKE" title="Kenya" />
        <Form.Dropdown.Item value="countryKI" title="Kiribati" />
        <Form.Dropdown.Item value="countryKW" title="Kuwait" />
        <Form.Dropdown.Item value="countryKG" title="Kyrgyzstan" />
        <Form.Dropdown.Item value="countryLA" title="Laos" />
        <Form.Dropdown.Item value="countryLV" title="Latvia" />
        <Form.Dropdown.Item value="countryLB" title="Lebanon" />
        <Form.Dropdown.Item value="countryLS" title="Lesotho" />
        <Form.Dropdown.Item value="countryLR" title="Liberia" />
        <Form.Dropdown.Item value="countryLY" title="Libya" />
        <Form.Dropdown.Item value="countryLI" title="Liechtenstein" />
        <Form.Dropdown.Item value="countryLT" title="Lithuania" />
        <Form.Dropdown.Item value="countryLU" title="Luxembourg" />
        <Form.Dropdown.Item value="countryMO" title="Macao" />
        <Form.Dropdown.Item value="countryMG" title="Madagascar" />
        <Form.Dropdown.Item value="countryMW" title="Malawi" />
        <Form.Dropdown.Item value="countryMY" title="Malaysia" />
        <Form.Dropdown.Item value="countryMV" title="Maldives" />
        <Form.Dropdown.Item value="countryML" title="Mali" />
        <Form.Dropdown.Item value="countryMT" title="Malta" />
        <Form.Dropdown.Item value="countryMH" title="Marshall Islands" />
        <Form.Dropdown.Item value="countryMQ" title="Martinique" />
        <Form.Dropdown.Item value="countryMR" title="Mauritania" />
        <Form.Dropdown.Item value="countryMU" title="Mauritius" />
        <Form.Dropdown.Item value="countryYT" title="Mayotte" />
        <Form.Dropdown.Item value="countryMX" title="Mexico" />
        <Form.Dropdown.Item value="countryFM" title="Micronesia" />
        <Form.Dropdown.Item value="countryMD" title="Moldova" />
        <Form.Dropdown.Item value="countryMC" title="Monaco" />
        <Form.Dropdown.Item value="countryMN" title="Mongolia" />
        <Form.Dropdown.Item value="countryMS" title="Montserrat" />
        <Form.Dropdown.Item value="countryMA" title="Morocco" />
        <Form.Dropdown.Item value="countryMZ" title="Mozambique" />
        <Form.Dropdown.Item value="countryMM" title="Myanmar (Burma)" />
        <Form.Dropdown.Item value="countryNA" title="Namibia" />
        <Form.Dropdown.Item value="countryNR" title="Nauru" />
        <Form.Dropdown.Item value="countryNP" title="Nepal" />
        <Form.Dropdown.Item value="countryNL" title="Netherlands" />
        <Form.Dropdown.Item value="countryNC" title="New Caledonia" />
        <Form.Dropdown.Item value="countryNZ" title="New Zealand" />
        <Form.Dropdown.Item value="countryNI" title="Nicaragua" />
        <Form.Dropdown.Item value="countryNE" title="Niger" />
        <Form.Dropdown.Item value="countryNG" title="Nigeria" />
        <Form.Dropdown.Item value="countryNU" title="Niue" />
        <Form.Dropdown.Item value="countryNF" title="Norfolk Island" />
        <Form.Dropdown.Item value="countryKP" title="North Korea" />
        <Form.Dropdown.Item value="countryMK" title="North Macedonia" />
        <Form.Dropdown.Item value="countryMP" title="Northern Mariana Islands" />
        <Form.Dropdown.Item value="countryNO" title="Norway" />
        <Form.Dropdown.Item value="countryOM" title="Oman" />
        <Form.Dropdown.Item value="countryPK" title="Pakistan" />
        <Form.Dropdown.Item value="countryPW" title="Palau" />
        <Form.Dropdown.Item value="countryPS" title="Palestine" />
        <Form.Dropdown.Item value="countryPA" title="Panama" />
        <Form.Dropdown.Item value="countryPG" title="Papua New Guinea" />
        <Form.Dropdown.Item value="countryPY" title="Paraguay" />
        <Form.Dropdown.Item value="countryPE" title="Peru" />
        <Form.Dropdown.Item value="countryPH" title="Philippines" />
        <Form.Dropdown.Item value="countryPN" title="Pitcairn Islands" />
        <Form.Dropdown.Item value="countryPL" title="Poland" />
        <Form.Dropdown.Item value="countryPT" title="Portugal" />
        <Form.Dropdown.Item value="countryPR" title="Puerto Rico" />
        <Form.Dropdown.Item value="countryQA" title="Qatar" />
        <Form.Dropdown.Item value="countryRE" title="Réunion" />
        <Form.Dropdown.Item value="countryRO" title="Romania" />
        <Form.Dropdown.Item value="countryRU" title="Russia" />
        <Form.Dropdown.Item value="countryRW" title="Rwanda" />
        <Form.Dropdown.Item value="countryWS" title="Samoa" />
        <Form.Dropdown.Item value="countrySM" title="San Marino" />
        <Form.Dropdown.Item value="countryST" title="São Tomé & Príncipe" />
        <Form.Dropdown.Item value="countrySA" title="Saudi Arabia" />
        <Form.Dropdown.Item value="countrySN" title="Senegal" />
        <Form.Dropdown.Item value="countryRS" title="Serbia" />
        <Form.Dropdown.Item value="countrySC" title="Seychelles" />
        <Form.Dropdown.Item value="countrySL" title="Sierra Leone" />
        <Form.Dropdown.Item value="countrySG" title="Singapore" />
        <Form.Dropdown.Item value="countrySK" title="Slovakia" />
        <Form.Dropdown.Item value="countrySI" title="Slovenia" />
        <Form.Dropdown.Item value="countrySB" title="Solomon Islands" />
        <Form.Dropdown.Item value="countrySO" title="Somalia" />
        <Form.Dropdown.Item value="countryZA" title="South Africa" />
        <Form.Dropdown.Item value="countryGS" title="South Georgia & South Sandwich Islands" />
        <Form.Dropdown.Item value="countryKR" title="South Korea" />
        <Form.Dropdown.Item value="countryES" title="Spain" />
        <Form.Dropdown.Item value="countryLK" title="Sri Lanka" />
        <Form.Dropdown.Item value="countrySH" title="St. Helena" />
        <Form.Dropdown.Item value="countryKN" title="St. Kitts & Nevis" />
        <Form.Dropdown.Item value="countryLC" title="St. Lucia" />
        <Form.Dropdown.Item value="countryPM" title="St. Pierre & Miquelon" />
        <Form.Dropdown.Item value="countryVC" title="St. Vincent & Grenadines" />
        <Form.Dropdown.Item value="countrySD" title="Sudan" />
        <Form.Dropdown.Item value="countrySR" title="Suriname" />
        <Form.Dropdown.Item value="countrySJ" title="Svalbard & Jan Mayen" />
        <Form.Dropdown.Item value="countrySE" title="Sweden" />
        <Form.Dropdown.Item value="countryCH" title="Switzerland" />
        <Form.Dropdown.Item value="countrySY" title="Syria" />
        <Form.Dropdown.Item value="countryTW" title="Taiwan" />
        <Form.Dropdown.Item value="countryTJ" title="Tajikistan" />
        <Form.Dropdown.Item value="countryTZ" title="Tanzania" />
        <Form.Dropdown.Item value="countryTH" title="Thailand" />
        <Form.Dropdown.Item value="countryTG" title="Togo" />
        <Form.Dropdown.Item value="countryTK" title="Tokelau" />
        <Form.Dropdown.Item value="countryTO" title="Tonga" />
        <Form.Dropdown.Item value="countryTT" title="Trinidad & Tobago" />
        <Form.Dropdown.Item value="countryTN" title="Tunisia" />
        <Form.Dropdown.Item value="countryTR" title="Türkiye" />
        <Form.Dropdown.Item value="countryTM" title="Turkmenistan" />
        <Form.Dropdown.Item value="countryTC" title="Turks & Caicos Islands" />
        <Form.Dropdown.Item value="countryTV" title="Tuvalu" />
        <Form.Dropdown.Item value="countryUM" title="U.S. Outlying Islands" />
        <Form.Dropdown.Item value="countryVI" title="U.S. Virgin Islands" />
        <Form.Dropdown.Item value="countryUG" title="Uganda" />
        <Form.Dropdown.Item value="countryUA" title="Ukraine" />
        <Form.Dropdown.Item value="countryAE" title="United Arab Emirates" />
        <Form.Dropdown.Item value="countryGB" title="United Kingdom" />
        <Form.Dropdown.Item value="countryUS" title="United States" />
        <Form.Dropdown.Item value="countryUY" title="Uruguay" />
        <Form.Dropdown.Item value="countryUZ" title="Uzbekistan" />
        <Form.Dropdown.Item value="countryVU" title="Vanuatu" />
        <Form.Dropdown.Item value="countryVA" title="Vatican City" />
        <Form.Dropdown.Item value="countryVE" title="Venezuela" />
        <Form.Dropdown.Item value="countryVN" title="Vietnam" />
        <Form.Dropdown.Item value="countryWF" title="Wallis & Futuna" />
        <Form.Dropdown.Item value="countryEH" title="Western Sahara" />
        <Form.Dropdown.Item value="countryYE" title="Yemen" />
        <Form.Dropdown.Item value="countryZM" title="Zambia" />
        <Form.Dropdown.Item value="countryZW" title="Zimbabwe" />
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
        id="as_occt_input"
        title="Terms Appearing"
        defaultValue="any"
        info="Search for terms in the whole page, page title or web address, or links to the page you're looking for."
      >
        <Form.Dropdown.Item value="any" title="anywhere in the page" />
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

      <Form.Dropdown id="sur" title="Usage Rights" defaultValue="" info="Find pages that you are free to use yourself.">
        <Form.Dropdown.Item value="" title="not filtered by licence" />
        <Form.Dropdown.Item value="f" title="free to use or share" />
        <Form.Dropdown.Item value="fc" title="free to use or share, even commercially" />
        <Form.Dropdown.Item value="fm" title="free to use share or modify" />
        <Form.Dropdown.Item value="fmc" title="free to use, share or modify, even commercially" />
      </Form.Dropdown>
    </Form>
  );
}
