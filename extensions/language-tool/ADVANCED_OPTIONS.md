# 🔧 LanguageTool Advanced Options

This guide explains all advanced options available in the extension for fine-tuning your grammar and style checks.

## 🎛️ How to Enable

1. Open **Raycast Settings** (⌘,)
2. Go to **Extensions** → **LanguageTool**
3. Check **"Show Advanced Options"**
4. Advanced fields will appear in the form!

## 📋 Available Options

### 1. **Check Level**

Controls the strictness of the verification.

**Values:**
- `Default` - Standard checking
- `Picky` - More strict checking, ideal for formal text

**When to use Picky:**
- ✅ Official documents
- ✅ Academic papers
- ✅ Professional emails
- ✅ Formal presentations

**Example:**
```
Default: "I want to go there" → OK
Picky: "I want to go there" → Suggestion: "I would like to go there" (more formal)
```

---

### 2. **Mother Tongue**

Your native language for detecting **false friends** (words that look similar but have different meanings).

**Format:** Language code (e.g., `en-US`, `pt-BR`, `es`)

**Example:**
- Text in English: "I am **embarrassed**"
- Mother Tongue: `pt-BR`
- Detects: "embarrassed" ≠ "embaraçada" (false friend!)

---

### 3. **Preferred Variants**

When using automatic detection (`auto`), specifies which language variants to prefer.

**Format:** Comma-separated list (e.g., `en-GB,de-AT`)

**Why use it:**
- The detector knows it's "English", but not if it's UK or US
- You specify: `en-GB` → uses British spelling
- Or: `en-US` → uses American spelling

**Example:**
```
Text: "The color is grey"
Without preference: Accepts both "color/colour" and "gray/grey"
With "en-GB": Suggests "colour" and "grey" (British)
With "en-US": Suggests "color" and "gray" (American)
```

---

### 4. **Enabled Rules**

Specific rule IDs you want to **enable**.

**Format:** Comma-separated list (e.g., `RULE_ID_1,RULE_ID_2`)

**How to find IDs:**
- [LanguageTool rule list](https://community.languagetool.org/rule/list)
- Or check in verification results (field `rule.id`)

**Example:**
```
MORFOLOGIK_RULE_EN_US - Spell checking for American English
COMMA_PARENTHESIS - Comma checking with parentheses
```

---

### 5. **Disabled Rules**

Rule IDs you want to **disable**.

**When to use:**
- ❌ Rule too strict for your case
- ❌ Too many false positives
- ❌ Specific style of your text

**Example:**
```
Disable: WHITESPACE_RULE
Reason: Your text uses special formatting with spaces
```

---

### 6. **Enabled Categories**

Entire categories of rules to enable.

**Common categories:**
- `GRAMMAR` - Grammar rules
- `TYPOS` - Typing errors
- `STYLE` - Style and clarity
- `PUNCTUATION` - Punctuation rules
- `CASING` - Capitalization
- `REDUNDANCY` - Redundancy checks
- `SEMANTICS` - Semantic rules

**Example:**
```
enabledCategories: "GRAMMAR,TYPOS"
Result: Only checks grammar and typing errors
```

---

### 7. **Disabled Categories**

Categories you want to **disable**.

**Example:**
```
disabledCategories: "STYLE"
Reason: You only want grammar corrections, not style suggestions
```

---

### 8. **Enable Only Specified Rules**

If checked, **ONLY** rules/categories in `enabledRules` or `enabledCategories` will be active.

**⚠️ Warning:** This disables ALL other rules!

**When to use:**
- ✅ Very specific verification
- ✅ You know exactly which rules you want

**Example:**
```
enabledRules: "COMMA_PARENTHESIS,UPPERCASE_SENTENCE_START"
enabledOnly: true
→ Checks ONLY commas and sentence capitalization
```

---

## 🎯 Practical Use Cases

### Case 1: Ultra-Strict Checking
```
Check Level: Picky
Mother Tongue: pt-BR
Enabled Categories: GRAMMAR,STYLE,PUNCTUATION
```
**Use for:** Academic papers, formal reports

### Case 2: Critical Errors Only
```
Check Level: Default
Enabled Categories: GRAMMAR,TYPOS
Disabled Categories: STYLE,PUNCTUATION
```
**Use for:** Quick checks, informal writing

### Case 3: British English Formal
```
Language: auto
Preferred Variants: en-GB
Check Level: Picky
Mother Tongue: pt-BR
```
**Use for:** UK formal documents

### Case 4: Disable Specific Rule
```
Check Level: Default
Disabled Rules: WHITESPACE_RULE,DOUBLE_PUNCTUATION
```
**Use for:** Code documentation, special formatting

### Case 5: Grammar Only
```
Enabled Categories: GRAMMAR
Enabled Only: true
```
**Use for:** ESL learners focusing on grammar

---

## 💡 Tips

1. **Start simple**: Use default options first
2. **Adjust as needed**: If you see many false positives, disable specific rules
3. **Use Picky for important docs**: Worth the extra checking
4. **Combine options**: Mother Tongue + Preferred Variants is very powerful
5. **Experiment**: Don't be afraid to test different combinations!
6. **Save common configs**: Use the same settings for similar document types
7. **Check rule IDs**: When you see a false positive, note the rule ID to disable it

---

## 🎓 Advanced Workflows

### Academic Writing
```yaml
Language: en-US
Check Level: Picky
Mother Tongue: [your native language]
Enabled Categories: GRAMMAR,STYLE,PUNCTUATION,REDUNDANCY
Disabled Rules: [any false positives you encounter]
```

### Creative Writing
```yaml
Language: auto
Check Level: Default
Disabled Categories: STYLE  # Allow creative freedom
Enabled Categories: GRAMMAR,TYPOS
```

### Technical Documentation
```yaml
Language: en-US
Check Level: Default
Disabled Rules: WHITESPACE_RULE
Enabled Categories: GRAMMAR,TYPOS,PUNCTUATION
```

### Social Media Posts
```yaml
Language: auto
Check Level: Default
Enabled Categories: TYPOS  # Just fix obvious errors
```

---

## 📊 Rule Priority

When you combine multiple options, they apply in this order:

1. **enabledOnly** - If true, starts with empty ruleset
2. **enabledCategories** - Adds entire categories
3. **enabledRules** - Adds specific rules
4. **disabledCategories** - Removes entire categories
5. **disabledRules** - Removes specific rules

**Example:**
```yaml
enabledCategories: GRAMMAR,STYLE
disabledRules: PASSIVE_VOICE
→ All grammar and style rules EXCEPT passive voice
```

---

## 🔍 Finding Rule IDs

### Method 1: From Results
When you check text and get suggestions, look at the metadata:
- Rule ID appears in the results
- Note it down to enable/disable later

### Method 2: Community List
- Visit [LanguageTool Community Rules](https://community.languagetool.org/rule/list)
- Browse by language and category
- Copy rule IDs you need

### Method 3: API Documentation
- Check [LanguageTool HTTP API Docs](https://languagetool.org/http-api/)
- See all available parameters and rules

---

## ⚠️ Common Pitfalls

### 1. **Too Restrictive**
```yaml
# ❌ BAD: Nothing will pass
Check Level: Picky
Enabled Only: true
Enabled Rules: COMMA_RULE
```
Only commas will be checked - you'll miss real errors!

### 2. **Conflicting Options**
```yaml
# ❌ BAD: Contradictory
Enabled Categories: STYLE
Disabled Categories: STYLE
```
Category is both enabled and disabled!

### 3. **Wrong Language Code**
```yaml
# ❌ BAD: Invalid code
Mother Tongue: portuguese  # Should be: pt-BR or pt-PT
```
Use proper ISO codes!

---

## 🌍 Language-Specific Tips

### English (en-US, en-GB)
- Always set variant: `en-US` or `en-GB`
- Use Picky mode for formal writing
- Set Mother Tongue to catch false friends

### Portuguese (pt-BR, pt-PT)
- Choose your variant (Brazilian vs European)
- Mother Tongue helps with Spanish false friends
- Disable `NEW_ORTHOGRAPHY` if you prefer old rules

### Spanish (es)
- Set regional variant if checking formal text
- Mother Tongue: `pt` helps with Portuguese false friends

### German (de-DE, de-AT, de-CH)
- Variant matters for formal letters
- Picky mode is very helpful
- Consider disabling `SWISS_GERMAN` if not in Switzerland

---

## 📚 Resources

- [LanguageTool Official API Documentation](https://languagetool.org/http-api/)
- [Community Rules List](https://community.languagetool.org/rule/list)
- [LanguageTool Development](https://languagetool.org/development/)
- [HTTP API Swagger](https://languagetool.org/http-api/swagger-ui/)

---

## 🔗 Premium Features

Premium accounts get additional benefits:

- ✅ **More rules** - Exclusive premium rules
- ✅ **Higher limits** - 80 req/min vs 20 req/min
- ✅ **Faster processing** - Dedicated servers
- ✅ **Better suggestions** - AI-powered improvements
- ✅ **Personal dictionary** - Add custom words
- ✅ **Style guide** - Company/publication styles

**Configure Premium:**
1. Get account at [languagetool.org](https://languagetool.org)
2. Get API key from [Access Tokens](https://languagetool.org/editor/settings/access-tokens)
3. Add to Raycast Settings → Extensions → LanguageTool

---

## 💬 Need Help?

- 🐛 [Report issues](https://github.com/raycast/extensions/issues)
- 💬 [Join the Raycast Community](https://raycast.com/community)
- 📖 [Main README](./README.md)

---

**Remember:** Advanced options give you control, but the defaults work great for most users. Start simple and add complexity only when needed!
