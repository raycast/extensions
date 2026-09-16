/**
 * A curated emoji set for the status picker, chosen to cover the situations
 * people actually put in a work status rather than the whole Unicode range,
 * so the dropdown stays scannable.
 *
 * Characters are written as Unicode escapes deliberately: the repository
 * avoids literal emoji glyphs in source.
 */
export interface EmojiEntry {
  char: string;
  shortcode: string;
  keywords: string;
}

export const EMOJI: EmojiEntry[] = [
  // Meetings, focus and work
  { char: "\u{1F4C5}", shortcode: ":calendar:", keywords: "meeting schedule date busy" },
  { char: "\u{1F5D3}", shortcode: ":spiral_calendar:", keywords: "meeting planning agenda" },
  { char: "\u{1F4DE}", shortcode: ":telephone_receiver:", keywords: "call phone meeting" },
  { char: "\u{1F4F1}", shortcode: ":mobile_phone:", keywords: "phone mobile call" },
  { char: "\u{1F4BB}", shortcode: ":laptop:", keywords: "working computer remote" },
  { char: "\u{1F5A5}", shortcode: ":desktop_computer:", keywords: "working desk office" },
  { char: "\u{1F9E0}", shortcode: ":brain:", keywords: "focus thinking deep work concentration" },
  { char: "\u{1F3AF}", shortcode: ":dart:", keywords: "focus target goal priority" },
  { char: "\u{1F525}", shortcode: ":fire:", keywords: "urgent busy crunch" },
  { char: "\u{1F4DD}", shortcode: ":memo:", keywords: "writing notes documentation" },
  { char: "\u{1F4CA}", shortcode: ":bar_chart:", keywords: "analysis data reporting" },
  { char: "\u{1F4D6}", shortcode: ":book:", keywords: "reading research learning" },
  { char: "\u{1F393}", shortcode: ":mortar_board:", keywords: "learning training course" },
  { char: "\u{1F3A7}", shortcode: ":headphones:", keywords: "focus music do not disturb" },
  { char: "\u{1F507}", shortcode: ":mute:", keywords: "quiet do not disturb silent" },
  { char: "\u{1F6AB}", shortcode: ":no_entry_sign:", keywords: "do not disturb blocked unavailable" },
  { char: "\u{26D4}", shortcode: ":no_entry:", keywords: "unavailable blocked stop" },
  { char: "\u{1F534}", shortcode: ":red_circle:", keywords: "busy unavailable away" },
  { char: "\u{1F7E2}", shortcode: ":green_circle:", keywords: "available free online" },
  { char: "\u{1F7E1}", shortcode: ":yellow_circle:", keywords: "away idle maybe" },
  { char: "\u{1F551}", shortcode: ":clock2:", keywords: "time waiting later" },
  { char: "\u{23F3}", shortcode: ":hourglass_flowing_sand:", keywords: "waiting time pending" },
  { char: "\u{1F6A7}", shortcode: ":construction:", keywords: "work in progress building" },
  { char: "\u{1F527}", shortcode: ":wrench:", keywords: "fixing maintenance debugging" },
  { char: "\u{1F41B}", shortcode: ":bug:", keywords: "debugging issue fixing" },
  { char: "\u{1F680}", shortcode: ":rocket:", keywords: "shipping launch release deploy" },
  { char: "\u{2705}", shortcode: ":white_check_mark:", keywords: "done complete finished" },
  { char: "\u{1F440}", shortcode: ":eyes:", keywords: "reviewing looking watching" },
  { char: "\u{1F4AC}", shortcode: ":speech_balloon:", keywords: "chat talking discussion" },
  { char: "\u{1F91D}", shortcode: ":handshake:", keywords: "interview pairing collaboration" },
  { char: "\u{1F3A4}", shortcode: ":microphone:", keywords: "presenting talk speaking" },
  { char: "\u{1F4FD}", shortcode: ":film_projector:", keywords: "presenting demo workshop" },

  // Breaks, food and drink
  { char: "\u{2615}", shortcode: ":coffee:", keywords: "break coffee tea morning" },
  { char: "\u{1F375}", shortcode: ":tea:", keywords: "break tea drink" },
  { char: "\u{1F374}", shortcode: ":fork_and_knife:", keywords: "lunch dinner eating meal break" },
  { char: "\u{1F957}", shortcode: ":green_salad:", keywords: "lunch food healthy break" },
  { char: "\u{1F355}", shortcode: ":pizza:", keywords: "lunch food dinner" },
  { char: "\u{1F962}", shortcode: ":takeout_box:", keywords: "lunch food takeaway" },
  { char: "\u{1F369}", shortcode: ":doughnut:", keywords: "snack break treat" },
  { char: "\u{1F37A}", shortcode: ":beer:", keywords: "social drinks after work" },
  { char: "\u{1F964}", shortcode: ":cup_with_straw:", keywords: "drink break refreshment" },
  { char: "\u{1F6BD}", shortcode: ":toilet:", keywords: "break bathroom away" },

  // Away, travel and holiday
  { char: "\u{1F3D6}", shortcode: ":beach_with_umbrella:", keywords: "holiday vacation away ooo" },
  { char: "\u{1F334}", shortcode: ":palm_tree:", keywords: "holiday vacation away ooo" },
  { char: "\u{2708}", shortcode: ":airplane:", keywords: "travel flight away trip" },
  { char: "\u{1F686}", shortcode: ":train:", keywords: "commute travel transit" },
  { char: "\u{1F697}", shortcode: ":car:", keywords: "commute driving travel" },
  { char: "\u{1F6B2}", shortcode: ":bicycle:", keywords: "commute cycling exercise" },
  { char: "\u{1F3E1}", shortcode: ":house_with_garden:", keywords: "remote home wfh" },
  { char: "\u{1F3E2}", shortcode: ":office:", keywords: "office onsite in person" },
  { char: "\u{1F30D}", shortcode: ":earth_africa:", keywords: "remote travel timezone" },
  { char: "\u{1F3D5}", shortcode: ":camping:", keywords: "holiday offline away" },
  { char: "\u{1F3BF}", shortcode: ":ski:", keywords: "holiday winter away" },
  { char: "\u{1F9F3}", shortcode: ":luggage:", keywords: "travel trip packing away" },
  { char: "\u{1F6CC}", shortcode: ":sleeping_accommodation:", keywords: "offline sleeping away night" },
  { char: "\u{1F634}", shortcode: ":sleeping_face:", keywords: "offline sleeping tired" },
  { char: "\u{1F31C}", shortcode: ":crescent_moon:", keywords: "night offline evening" },

  // Health and personal
  { char: "\u{1F912}", shortcode: ":face_with_thermometer:", keywords: "sick ill unwell" },
  { char: "\u{1F927}", shortcode: ":sneezing_face:", keywords: "sick cold unwell" },
  { char: "\u{1F915}", shortcode: ":face_with_head_bandage:", keywords: "sick injured unwell" },
  { char: "\u{1F3E5}", shortcode: ":hospital:", keywords: "appointment medical doctor" },
  { char: "\u{1F489}", shortcode: ":syringe:", keywords: "appointment medical vaccine" },
  { char: "\u{1F9D8}", shortcode: ":person_in_lotus_position:", keywords: "break wellbeing meditation" },
  { char: "\u{1F3CB}", shortcode: ":weight_lifter:", keywords: "gym exercise break" },
  { char: "\u{1F3C3}", shortcode: ":runner:", keywords: "exercise running break" },
  { char: "\u{1F6B6}", shortcode: ":walking:", keywords: "walk break outside" },
  { char: "\u{1F415}", shortcode: ":dog:", keywords: "walk pet break" },
  { char: "\u{1F476}", shortcode: ":baby:", keywords: "childcare family away" },
  { char: "\u{1F468}", shortcode: ":man:", keywords: "family personal away" },
  { char: "\u{1F3E0}", shortcode: ":house:", keywords: "home personal errand" },

  // Celebration and mood
  { char: "\u{1F389}", shortcode: ":tada:", keywords: "celebration launch birthday party" },
  { char: "\u{1F38A}", shortcode: ":confetti_ball:", keywords: "celebration party milestone" },
  { char: "\u{1F382}", shortcode: ":birthday:", keywords: "birthday celebration cake" },
  { char: "\u{1F973}", shortcode: ":partying_face:", keywords: "celebration party fun" },
  { char: "\u{1F60A}", shortcode: ":blush:", keywords: "happy friendly good" },
  { char: "\u{1F642}", shortcode: ":slightly_smiling_face:", keywords: "happy fine ok" },
  { char: "\u{1F60E}", shortcode: ":sunglasses:", keywords: "relaxed cool easy" },
  { char: "\u{1F44B}", shortcode: ":wave:", keywords: "hello goodbye leaving" },
  { char: "\u{1F44D}", shortcode: ":thumbsup:", keywords: "ok good approved" },
  { char: "\u{1F64F}", shortcode: ":pray:", keywords: "thanks please hoping" },
  { char: "\u{1F4AA}", shortcode: ":muscle:", keywords: "effort strong pushing" },
  { char: "\u{1F971}", shortcode: ":yawning_face:", keywords: "tired low energy" },
  { char: "\u{1F975}", shortcode: ":hot_face:", keywords: "hot summer struggling" },
  { char: "\u{1F976}", shortcode: ":cold_face:", keywords: "cold winter freezing" },

  // Weather and seasons
  { char: "\u{2600}", shortcode: ":sunny:", keywords: "sunny weather summer outside" },
  { char: "\u{26C5}", shortcode: ":partly_sunny:", keywords: "weather mild outside" },
  { char: "\u{2601}", shortcode: ":cloud:", keywords: "weather cloudy grey" },
  { char: "\u{1F327}", shortcode: ":rain_cloud:", keywords: "weather rain wet" },
  { char: "\u{26C4}", shortcode: ":snowman:", keywords: "weather snow winter" },
  { char: "\u{1F328}", shortcode: ":snow_cloud:", keywords: "weather snow winter" },
  { char: "\u{1F30A}", shortcode: ":ocean:", keywords: "sea holiday summer" },

  // Objects and misc
  { char: "\u{1F4E7}", shortcode: ":email:", keywords: "email inbox catching up" },
  { char: "\u{1F4EC}", shortcode: ":mailbox:", keywords: "inbox email messages" },
  { char: "\u{1F514}", shortcode: ":bell:", keywords: "notifications alerts on call" },
  { char: "\u{1F515}", shortcode: ":no_bell:", keywords: "notifications off quiet muted" },
  { char: "\u{1F512}", shortcode: ":lock:", keywords: "private secure unavailable" },
  { char: "\u{1F511}", shortcode: ":key:", keywords: "access permissions security" },
  { char: "\u{1F4A1}", shortcode: ":bulb:", keywords: "idea thinking brainstorming" },
  { char: "\u{2699}", shortcode: ":gear:", keywords: "settings config maintenance" },
  { char: "\u{1F4E6}", shortcode: ":package:", keywords: "shipping release delivery" },
  { char: "\u{1F4CC}", shortcode: ":pushpin:", keywords: "pinned important note" },
  { char: "\u{1F517}", shortcode: ":link:", keywords: "link reference url" },
  { char: "\u{1F41D}", shortcode: ":bee:", keywords: "buzz busy working" },
];

/**
 * Every term the picker should match for one entry.
 *
 * The shortcode's own name has to be in here explicitly. It is visible in the
 * item title, but only wrapped in colons (`:brain:`), and Raycast's filter does
 * not match across that punctuation, so searching "brain" found nothing: the
 * most obvious search term for an emoji was the one that could not find it.
 *
 * Underscored names are also split, so `:sneezing_face:` answers to
 * "sneezing_face", "sneezing" and "face" alike.
 */
export function emojiSearchTerms(entry: EmojiEntry): string[] {
  const name = entry.shortcode.replaceAll(":", "");
  return [...new Set([name, ...name.split("_"), ...entry.keywords.split(" ")])];
}

/** True when every character of `needle` appears in `haystack`, in order. */
function isSubsequence(needle: string, haystack: string): boolean {
  let i = 0;
  for (const ch of haystack) {
    if (ch === needle[i]) i += 1;
    if (i === needle.length) return true;
  }
  return false;
}

/**
 * How well one entry answers a query. 0 means no match at all.
 *
 * Ranked rather than boolean so an exact name beats an incidental keyword:
 * searching "bee" should put :bee: first, not an entry that merely mentions
 * bees. Ties keep dataset order, which groups the list by category.
 */
function scoreEntry(entry: EmojiEntry, query: string): number {
  let best = 0;
  for (const term of emojiSearchTerms(entry)) {
    if (term === query) return 4;
    if (term.startsWith(query)) best = Math.max(best, 3);
    else if (term.includes(query)) best = Math.max(best, 2);
    else if (isSubsequence(query, term)) best = Math.max(best, 1);
  }
  return best;
}

/**
 * Filter and rank the picker for a query, fuzzily.
 *
 * This exists because Raycast's own dropdown filtering cannot do the job:
 * `Form.Dropdown.Item` declares a `keywords` prop documented as "searched in
 * addition to the title", but it is not honoured, and the native filter matches
 * only prefixes of whitespace-separated title tokens. Since the title reads
 * ":brain:", typing ":brain" matched and typing "brain" did not, and none of the
 * curated keywords ("lunch", "wfh") worked at all. Setting `onSearchTextChange`
 * on the dropdown turns the native filter off and lets this run instead.
 *
 * Every colon is stripped from the query (not just a leading or trailing one),
 * so a habitual ":brain" still works, and so does something like "wo:rk".
 */
export function searchEmoji(query: string): EmojiEntry[] {
  const q = query.trim().toLowerCase().replaceAll(":", "");
  if (!q) return [...EMOJI];
  return EMOJI.map((entry) => ({ entry, score: scoreEntry(entry, q) }))
    .filter((scored) => scored.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((scored) => scored.entry);
}
