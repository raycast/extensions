// Hard content gate — pure functions, no platform dependencies.

export type ContentViolationCategory =
  | "csam"
  | "terrorism_weapons"
  | "fraud_scam"
  | "illicit_drugs"
  | "malware_harm"
  | "targeted_violence"
  | "account_compromise"
  | "financial_automation"
  | "credential_theft";

export interface ContentGateResult {
  blocked: boolean;
  category?: ContentViolationCategory;
  matchedPattern?: string;
}

interface PatternRule {
  category: ContentViolationCategory;
  re: RegExp;
}

const PATTERNS: PatternRule[] = [
  {
    category: "csam",
    re: /\b(child|children|minor|minors|underage|preteen|kid|kids|toddler|infant)\b[\s\S]{0,40}\b(porn|pornograph|sexual|sexually|nude|nudity|naked|abuse|exploit|exploitation|csam|cp\b|grooming|seduce|rape|molest)/i,
  },
  {
    category: "csam",
    re: /\b(porn|sexual|nude|nudity|naked|abuse|exploit|grooming|molest)\b[\s\S]{0,40}\b(child|children|minor|minors|underage|preteen|kid|kids|toddler|infant)/i,
  },
  {
    category: "terrorism_weapons",
    re: /\b(plan|planning|carry out|carrying out|commit|execute|conduct|stage)\b[\s\S]{0,30}\b(attack|terror|terrorism|terrorist|bombing|massacre|mass shooting|school shooting)/i,
  },
  {
    category: "terrorism_weapons",
    re: /\b(make|build|construct|synthesize|assemble|build me|help me build|how (?:do|to) (?:i )?(?:make|build|build an|build a|construct))\b[\s\S]{0,30}\b(bomb|explosive|ied|pipe bomb|c4|tnt|nerve agent|sarin|vx|chlorine gas|chemical weapon|biological weapon|bioweapon|dirty bomb|nuclear (?:bomb|weapon|device)|radiological device|ricin|anthrax|napalm|molotov)/i,
  },
  {
    category: "terrorism_weapons",
    re: /\b(attack|target|hit|bomb|shoot up)\b[\s\S]{0,30}\b(school|church|mosque|synagogue|government building|federal building|airport|crowded|crowd|public building|police station|hospital)/i,
  },
  {
    category: "fraud_scam",
    re: /\b(fraud|scam|scammer|scamming|defraud|swindle|con|phish|phishing|launder|laundering)\b[\s\S]{0,40}\b(bot|agent|assistant|helper|tool|system|workflow|pipeline|operation|business|people|users|elderly|customers|seniors|targets|victims|small business|small businesses|out of money|out of their money)/i,
  },
  {
    category: "fraud_scam",
    re: /\b(create|make|generate|forge|fabricate|produce|fake|build me|help me|build|design)\b[\s\S]{0,30}\b(fake|fraudulent|forged|counterfeit)\b[\s\S]{0,30}\b(invoice|invoices|receipt|receipts|id|ids|identification|passport|driver(?:'s)? license|tax return|w[- ]?2|paystub|pay stub|check|checks|bank statement)/i,
  },
  {
    category: "fraud_scam",
    re: /\b(steal|drain|empty|siphon|skim)\b[\s\S]{0,30}\b(money|funds|account|accounts|wallet|wallets|crypto)\b/i,
  },
  {
    category: "fraud_scam",
    re: /\b(romance scam|pig butchering|419|nigerian prince|sweepstakes scam|tech support scam|grandparent scam|irs scam|wire fraud|invoice fraud|business email compromise|bec scam|cnp fraud|carding)\b/i,
  },
  {
    category: "illicit_drugs",
    re: /\b(synthesize|cook|manufacture|how (?:do|to) (?:i )?make|recipe for|step[- ]by[- ]step)\b[\s\S]{0,30}\b(meth|methamphetamine|fentanyl|heroin|cocaine|crack cocaine|mdma|ecstasy|lsd|gbl|gbh|krokodil|carfentanil)/i,
  },
  {
    category: "malware_harm",
    re: /\b(write|build|create|develop|generate|make me)\b[\s\S]{0,30}\b(ransomware|keylogger|stealer|infostealer|rootkit|botnet|ddos tool|credential stealer|banking trojan|crypto drainer|wallet drainer)/i,
  },
  {
    category: "account_compromise",
    re: /\b(?:logs?|logging|signs?|signing)\s+in(?:to)?\b[\s\S]{0,40}\b(bank(?:ing)?|brokerage|broker|fidelity|schwab|vanguard|robinhood|coinbase|binance|kraken|chase|wells fargo|bank of america|citibank|capital one|paypal|venmo|cash app|zelle|ach|wire transfer|investment account|retirement account|401k|trading account)\b/i,
  },
  {
    category: "account_compromise",
    re: /\b(authenticates?|authenticating|accesses?|accessing|scrapes?|scraping|crawls?|crawling|fetches?|fetching|automates?|automating)\b[\s\S]{0,40}\b(bank(?:ing)?|brokerage|broker|fidelity|schwab|vanguard|robinhood|coinbase|binance|kraken|chase|wells fargo|bank of america|citibank|capital one|paypal|venmo|cash app|zelle|investment account|retirement account|401k|trading account)\b/i,
  },
  {
    category: "account_compromise",
    re: /\b(script|tool|bot|agent|program|code|automation)\b[\s\S]{0,40}\b(?:logs?|logging|signs?|signing)\s+in(?:to)?\b/i,
  },
  {
    category: "account_compromise",
    re: /\b(?:logs?|logging|signs?|signing)\s+in(?:to)?\b[\s\S]{0,30}\bsomeone(?:'s)?\b/i,
  },
  {
    category: "account_compromise",
    re: /\b(bypass|circumvent|crack|brute[- ]?force)\b[\s\S]{0,30}\b(2fa|two[- ]factor|mfa|otp|password|login|captcha|rate ?limit|paywall)\b/i,
  },
  {
    category: "financial_automation",
    re: /\b(auto(?:matic(?:ally)?)?|programmatic(?:ally)?|on(?:[- ])?my(?:[- ])?behalf|without (?:my )?(?:approval|confirmation))\b[\s\S]{0,40}\b(transfers?|sends?|moves?|wires?|withdraws?|drains?|sweeps?|pays?)\b[\s\S]{0,30}\b(money|funds|balance|cash|usd|dollars?|btc|eth|crypto|account)\b/i,
  },
  {
    category: "financial_automation",
    re: /\b(transfers?|sends?|moves?|wires?|withdraws?|sweeps?)\b[\s\S]{0,40}\b(money|funds|balance|cash|dollars?)\b[\s\S]{0,60}\b(if|when|whenever|once|after|every time)\b[\s\S]{0,40}\b(balance|amount|threshold|exceeds?|drops?|hits?|reaches?|above|below|over|under)\b/i,
  },
  {
    category: "financial_automation",
    re: /\b(?:scrapes?|scraping|reads?|reading|fetches?|fetching|pulls?|pulling|extracts?|extracting)\b[\s\S]{0,40}\b(account balance|transaction history|statements?|transactions|portfolio|positions?)\b[\s\S]{0,60}\b(bank(?:ing)?|brokerage|chase|wells fargo|fidelity|schwab|vanguard|robinhood|paypal|venmo|coinbase|binance)\b/i,
  },
  {
    category: "financial_automation",
    re: /\b(?:scrapes?|scraping|reads?|reading|fetches?|fetching|pulls?|pulling|extracts?|extracting|checks?|checking|monitors?|monitoring)\b[\s\S]{0,30}\b(?:my|the user(?:'s)?|someone(?:'s)?)\b[\s\S]{0,30}\b(chase|wells fargo|bank of america|citibank|capital one|fidelity|schwab|vanguard|robinhood|coinbase|paypal|venmo|bank(?: account)?|brokerage|trading)\b[\s\S]{0,30}\b(balance|account|statement|transactions?|portfolio|positions?)\b/i,
  },
  {
    category: "financial_automation",
    re: /\b(?:logs?|logging|signs?|signing)\s+in(?:to)?\b[\s\S]{0,30}\b(?:my|the user(?:'s)?|someone(?:'s)?)\b[\s\S]{0,20}\b(bank(?: account)?|brokerage|trading account|investment account)\b/i,
  },
  {
    category: "credential_theft",
    re: /\b(steal|harvest|grab|capture|exfiltrate|sniff|intercept|phish|skim)\b[\s\S]{0,30}\b(password|passwords|credentials?|cookies|session(?: tokens?)?|api keys?|2fa codes?|otps?|seed phrase|private keys?|wallet keys?)\b/i,
  },
  {
    category: "credential_theft",
    re: /\b(keylogger|password stealer|credential stealer|info ?stealer|cookie stealer|session hijacker|token grabber)\b/i,
  },
  {
    category: "credential_theft",
    re: /\b(stores?|storing|saves?|saving|logs?|logging|captures?|capturing|records?|recording)\b[\s\S]{0,30}\b(plaintext|plain[- ]?text|cleartext|unhashed|raw|unencrypted)\b[\s\S]{0,20}\bpasswords?\b/i,
  },
  {
    category: "credential_theft",
    re: /\bpasswords?\b[\s\S]{0,30}\bin\s+(plaintext|plain[- ]?text|cleartext|unhashed|raw|unencrypted)\b/i,
  },
  {
    category: "targeted_violence",
    re: /\b(kill|murder|assassinate|harm|stalk|track down|hurt|attack)\b[\s\S]{0,40}\b(my (?:ex|wife|husband|boss|coworker|neighbor|teacher)|specific person|named individual|this person)\b/i,
  },
  {
    category: "targeted_violence",
    re: /\b(find|dox|doxx|expose|leak)\b[\s\S]{0,30}\b(home address|personal address|real name|ssn|social security|phone number)\b[\s\S]{0,40}\b(so (?:i|we) can|to (?:hurt|harm|kill|attack|confront|threaten))/i,
  },
];

export function evaluateContent(input: string): ContentGateResult {
  const text = (input ?? "").toString();
  if (!text.trim()) return { blocked: false };
  for (const rule of PATTERNS) {
    if (rule.re.test(text)) {
      return {
        blocked: true,
        category: rule.category,
        matchedPattern: rule.re.source,
      };
    }
  }
  return { blocked: false };
}

export const SAFETY_REFUSAL_MESSAGE = "I cannot assist with that request.";
