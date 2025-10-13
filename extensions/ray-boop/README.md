# Ray Boop
Port of [Boop](https://github.com/IvanMathy/Boop) to Raycast

Select Text in an editor and run Ray Boop to select a text transform and paste directly back into your text document or Shift + Enter to copy to clipboard.

If no text is selected it will take the text from your clipboard instead and transform the text to your clipboard or Shift + Enter to paste in the active window.

## Features

- **Smart Input Detection**: Automatically detects selected text, falls back to clipboard
- **Context-Sensitive Actions**: Different primary actions based on input source
- **Live Preview**: See transformation results before applying (can be toggled in preferences)
- **Smart Suggestions**: AI-powered script suggestions based on your content
- **Script Information**: Enhanced feedback with info and error messages

## Available Scripts

### 🔤 Text Case Operations
- **Camel Case** 🐫 - convertsYourTextToCamelCase
- **Kebab Case** 🔗 - converts-your-text-to-kebab-case
- **Snake Case** 🐍 - converts_your_text_to_snake_case
- **Start Case** 🎯 - Converts Your Text To Start Case
- **Sponge Case** 🧽 - cOnVeRtS yOuR tExT tO sPoNgE cAsE
- **Uppercase** ⬆️ - CONVERTS YOUR TEXT TO UPPERCASE
- **Lowercase** ⬇️ - converts your text to lowercase
- **Toggle Camel/Hyphen** 🔄 - Toggles between camelCase and hyphen-case

### 🔒 Encoding/Decoding
- **Base64 Encode** 🔒 - Encodes your text to Base64
- **Base64 Decode** 🔓 - Decodes your text from Base64
- **URL Encode** 🌐 - Encodes your text for URLs
- **URL Decode** 🌐 - Decodes URL encoded text
- **HTML Encode** 📝 - Encodes HTML entities
- **HTML Decode** 📝 - Decodes HTML entities
- **HTML Encode All** 📝 - Encodes all characters as HTML entities
- **URL Entities Encode** 🌐 - Encodes URL entities
- **URL Entities Decode** 🌐 - Decodes URL entities

### 🔐 Hash/Crypto
- **MD5 Checksum** 🔐 - Computes the MD5 checksum of your text
- **SHA1 Checksum** 🔑 - Computes the SHA1 checksum of your text
- **SHA256 Checksum** 🛡️ - Computes the SHA256 checksum of your text
- **SHA512 Checksum** 🔒 - Computes the SHA512 checksum of your text
- **ROT13** 🔄 - Applies ROT13 cipher to your text
- **JWT Decode** 🗝️ - Decodes JSON Web Tokens

### ✨ Formatting
- **Format JSON** ✨ - Cleans and formats JSON documents
- **Format XML** 📄 - Formats XML documents
- **Format CSS** 🎨 - Formats CSS stylesheets
- **Format SQL** 🗄️ - Formats SQL queries
- **Minify JSON** 📦 - Minifies JSON by removing whitespace
- **Minify XML** 📦 - Minifies XML by removing whitespace
- **Minify CSS** 📦 - Minifies CSS by removing whitespace
- **Minify SQL** 📦 - Minifies SQL by removing whitespace
- **Normalize to NFC** 🔤 - Normalizes text to NFC (Normalization Form C)
- **Normalize to NFD** 🔤 - Normalizes text to NFD (Normalization Form D)
- **Normalize to NFKC** 🔤 - Normalizes text to NFKC (Normalization Form KC)
- **Normalize to NFKD** 🔤 - Normalizes text to NFKD (Normalization Form KD)  

### 🔄 Data Conversion
- **JSON to YAML** 🔄 - Converts JSON to YAML format
- **YAML to JSON** 🔄 - Converts YAML to JSON format
- **JSON to CSV** 📊 - Converts JSON to CSV format
- **CSV to JSON** 📊 - Converts CSV to JSON format
- **CSV to JSON (Headerless)** 📊 - Converts headerless CSV to JSON
- **JSON to Query String** 🌐 - Converts JSON to URL query string
- **Query String to JSON** 🌐 - Converts URL query string to JSON
- **JS Object to JSON** 📝 - Converts JavaScript object notation to JSON
- **JS to PHP** 🔄 - Converts JavaScript arrays to PHP arrays
- **TSV to JSON** 📊 - Converts Tab-Separated Values to JSON

### 💻 Number Systems
- **Binary to Decimal** 💻 - Converts binary numbers to decimal
- **Decimal to Binary** 💻 - Converts decimal numbers to binary
- **Decimal to Hex** 🔢 - Converts decimal numbers to hexadecimal
- **Hex to Decimal** 🔢 - Converts hexadecimal numbers to decimal
- **ASCII to Hex** 🔤 - Converts ASCII text to hexadecimal
- **Hex to ASCII** 🔤 - Converts hexadecimal to ASCII text
- **DIGI to ASCII** 🔤 - Converts DIGI format to ASCII

### 🎨 Colors
- **Hex to RGB** 🎨 - Converts hex colors to RGB
- **RGB to Hex** 🎨 - Converts RGB colors to hex
- **Contrasting Color** 🌈 - Finds contrasting color for given color

### ✂️ Text Processing
- **Add Slashes** 💬 - Adds slashes before quotes
- **Remove Slashes** 🚫 - Removes slashes before quotes
- **Trim** ✂️ - Removes whitespace from beginning and end
- **Trim Start** ✂️ - Removes whitespace from beginning
- **Trim End** ✂️ - Removes whitespace from end
- **Collapse Whitespace** 📦 - Collapses multiple whitespace into single spaces
- **Remove Accents** 🔤 - Removes accents and diacritics from text
- **Replace Smart Quotes** 💬 - Replaces smart quotes with regular quotes

### 📏 Line Operations
- **Join Lines** 🔗 - Joins all lines into a single line
- **Join Lines with Comma** 🔗 - Joins lines with comma separator
- **Join Lines with Space** 🔗 - Joins lines with space separator
- **Reverse Lines** 🔄 - Reverses the order of lines
- **Shuffle Lines** 🎲 - Randomly shuffles the order of lines
- **Sort Lines** 📊 - Sorts lines alphabetically
- **Natural Sort** 📊 - Sorts lines using natural sorting
- **Remove Duplicates** 🗑️ - Removes duplicate lines

### 📊 Statistics
- **Count Characters** 🔢 - Counts the number of characters
- **Count Words** 📝 - Counts the number of words
- **Count Lines** 📏 - Counts the number of lines
- **Calculate Size** 📐 - Calculates the size of text in bytes
- **Sum All Numbers** ➕ - Sums all numbers found in text

### 🌍 Unicode
- **To Unicode** 🌍 - Converts text to Unicode escape sequences
- **From Unicode** 🌍 - Converts Unicode escape sequences to text

### ⚡ Utility
- **Reverse String** 🔄 - Reverses the characters in text
- **Shuffle Characters** 🎲 - Randomly shuffles characters
- **Lorem Ipsum** 📄 - Generates Lorem Ipsum placeholder text
- **Generate Hashtag** #️⃣ - Converts text to hashtag format
- **Markdown Quote** 💬 - Formats text as Markdown blockquote
- **List to HTML** 📋 - Converts text lines to HTML list
- **Convert to Markdown Table** 📊 - Converts data to Markdown table

### ⏰ Date/Time
- **Date to Timestamp** ⏰ - Converts date to Unix timestamp
- **Date to UTC** 🌐 - Converts date to UTC format
- **Time to Seconds** ⏱️ - Converts time format to seconds

### ⚡ Development
- **Eval JavaScript** ⚡ - Evaluates JavaScript code

### 📱 Mobile Development
- **Android to iOS Strings** 📱 - Converts Android strings to iOS format
- **iOS to Android Strings** 📱 - Converts iOS strings to Android format

### 🛡️ Security
- **URL Defang** 🛡️ - Defangs URLs for security analysis
- **URL Refang** 🛡️ - Refangs defanged URLs

### 📦 Data Processing
- **PHP Unserialize** 📦 - Unserializes PHP data
- **Sort JSON** 🔤 - Sorts JSON object keys
- **Line Comparer** 🔍 - Compares lines between texts

### 🗺️ Geospatial
- **WKB to WKT** 🗺️ - Converts Well-Known Binary to Well-Known Text
- **WKT to WKB** 🗺️ - Converts Well-Known Text to Well-Known Binary

### 🐟 File/Path
- **Fish Hex Path Converter** 🐟 - Converts Fish shell hex paths

### 📚 Project Management
- **Create Project Glossary** 📚 - Creates a project glossary in Markdown

### ⏰ Special
- **Wadsworth Constant** ⏰ - Applies Wadsworth constant to text