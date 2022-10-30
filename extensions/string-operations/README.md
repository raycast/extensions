# alfred-string-operations
You can find list of operation that this extension provides.

All of the operation is performed to the content on the clipboard.
The result will be saved to the clipboard.

## Encoding / Decoding
### base64 decode
Decodes base64
#### Example
##### Source
```
VGhlcmUgYXJlIHR3byBNdXN0YWZhIEtlbWFsJ3MuIE9uZSBpcyB0aGUgZmxlc2gtYW5kLWJvbmUgTXVzdGFmYSBLZW1hbCB3aG8gbm93IHN0YW5kcyBiZWZvcmUgeW91IGFuZCB3aG8gd2lsbCBwYXNzIGF3YXkuIFRoZSBvdGhlciBpcyB5b3UsIGFsbCBvZiB5b3UgaGVyZSB3aG8gd2lsbCBnbyB0byB0aGUgZmFyIGNvcm5lcnMgb2Ygb3VyIGxhbmQgdG8gc3ByZWFkIHRoZSBpZGVhbHMgd2hpY2ggbXVzdCBiZSBkZWZlbmRlZCB3aXRoIHlvdXIgbGl2ZXMgaWYgbmVjZXNzYXJ5LiBJIHN0YW5kIGZvciB0aGUgbmF0aW9uJ3MgZHJlYW1zLCBhbmQgbXkgbGlmZSdzIHdvcmsgaXMgdG8gbWFrZSB0aGVtIGNvbWUgdHJ1ZS4=
```
##### Destination
```
There are two Mustafa Kemal's. One is the flesh-and-bone Mustafa Kemal who now stands before you and who will pass away. The other is you, all of you here who will go to the far corners of our land to spread the ideals which must be defended with your lives if necessary. I stand for the nation's dreams, and my life's work is to make them come true.
```

### base64 encode
Encodes base64
#### Example
##### Source
```
There are two Mustafa Kemal's. One is the flesh-and-bone Mustafa Kemal who now stands before you and who will pass away. The other is you, all of you here who will go to the far corners of our land to spread the ideals which must be defended with your lives if necessary. I stand for the nation's dreams, and my life's work is to make them come true.
```
##### Destination
```
VGhlcmUgYXJlIHR3byBNdXN0YWZhIEtlbWFsJ3MuIE9uZSBpcyB0aGUgZmxlc2gtYW5kLWJvbmUgTXVzdGFmYSBLZW1hbCB3aG8gbm93IHN0YW5kcyBiZWZvcmUgeW91IGFuZCB3aG8gd2lsbCBwYXNzIGF3YXkuIFRoZSBvdGhlciBpcyB5b3UsIGFsbCBvZiB5b3UgaGVyZSB3aG8gd2lsbCBnbyB0byB0aGUgZmFyIGNvcm5lcnMgb2Ygb3VyIGxhbmQgdG8gc3ByZWFkIHRoZSBpZGVhbHMgd2hpY2ggbXVzdCBiZSBkZWZlbmRlZCB3aXRoIHlvdXIgbGl2ZXMgaWYgbmVjZXNzYXJ5LiBJIHN0YW5kIGZvciB0aGUgbmF0aW9uJ3MgZHJlYW1zLCBhbmQgbXkgbGlmZSdzIHdvcmsgaXMgdG8gbWFrZSB0aGVtIGNvbWUgdHJ1ZS4=
```

### percent decode
Decodes a percent encoded string
#### Example
##### Source
```
Peace%20at%20home%2C%20peace%20in%20the%20world.
```
##### Destination
```
Peace at home, peace in the world.
```

### percent encode
Percent encodes the string
#### Example
##### Source
```
Peace at home, peace in the world.
```
##### Destination
```
Peace%20at%20home%2C%20peace%20in%20the%20world.
```

## Prettifiers
### json prettify
Prettifies json
#### Example
##### Source
```json
{
  "name": "Mustafa Kemal Ataturk", "UNESCO Resolutions": [
"Convinced that personalities who worked for understanding and cooperation between nations and international peace will be examples for future generations",
  "Recalling that the hundredth anniversary of the birth of Mustafa Kemal Atatürk, founder of the Turkish Republic, will be celebrated in 1981,",
"Knowing that he was an exceptional reformer in all fields relevant to the competence of UNESCO",
"Recognizing in particular that he was the leader of the first struggle given against colonialism and imperialism",
"Recalling that he was the remarkable promoter of the sense of understanding between peoples and durable peace between the nations of the world and that he worked all his life for the development of harmony and cooperation between peoples without distinction of color, religion and race",
"It is decided that UNESCO should colloborate in 1981 with the Turkish Government on both intellectual and technical plans for an international colloquium with the aim of acquainting the world with the various aspects of the personality and deeds of Atatürk whose objective was to promote world peace, international understanding and respect for human rights."
]
}
```
##### Destination
```json
{
    "UNESCO Resolutions": [
        "Convinced that personalities who worked for understanding and cooperation between nations and international peace will be examples for future generations",
        "Recalling that the hundredth anniversary of the birth of Mustafa Kemal Ataturk, founder of the Turkish Republic, will be celebrated in 1981,",
        "Knowing that he was an exceptional reformer in all fields relevant to the competence of UNESCO",
        "Recognizing in particular that he was the leader of the first struggle given against colonialism and imperialism",
        "Recalling that he was the remarkable promoter of the sense of understanding between peoples and durable peace between the nations of the world and that he worked all his life for the development of harmony and cooperation between peoples without distinction of color, religion and race",
        "It is decided that UNESCO should colloborate in 1981 with the Turkish Government on both intellectual and technical plans for an international colloquium with the aim of acquainting the world with the various aspects of the personality and deeds of Atat\u00fcrk whose objective was to promote world peace, international understanding and respect for human rights."
    ],
    "name": "Mustafa Kemal Ataturk"
}
```


### remove non-alpha numeric
Removes non alphanumeric characters from string
#### Example
##### Source
```json
"Mankind is a single body and each nation a part of that body. We must never say 'What does it matter to me if some part of the world is ailing?' If there is such an illness, we must concern ourselves with it as though we were having that illness."
```
##### Destination
```
MankindisasinglebodyandeachnationapartofthatbodyWemustneversayWhatdoesitmattertomeifsomepartoftheworldisailingIfthereissuchanillnesswemustconcernourselveswithitasthoughwewerehavingthatillness
```

## Case Operations
### camelcase
Converts string to camel case
#### Example
##### Source
```
The governments most creative and significant duty is education
```
##### Destination
```
theGovernmentsMostCreativeAndSignificantDutyIsEducation
```

### capitalize first letters
Capitalizes each word
#### Example
##### Source
```
The major challenge facing us is to elevate our national life to the highest level of civilization and prosperity
```
##### Destination
```
The Major Challenge Facing Us Is To Elevate Our National Life To The Highest Level Of Civilization And Prosperity
```

### kebab-case
Converts a string to kebab case and copies into clipboard
#### Example
##### Source
```
Every nation as the right to demand proper treatment and no country should violate the territory of any other country.
```
##### Destination
```
every-nation-as-the-right-to-demand-proper-treatment-and-no-country-should-violate-the-territory-of-any-other-country.
```

### lowercase
Lowercases the string
#### Example
##### Source
```
A nation which makes the final sacrifice for life and freedom does not get beaten.
```
##### Destination
```
a nation which makes the final sacrifice for life and freedom does not get beaten.
```

### pascalcase
Pascalcases the string
#### Example
##### Source
```
Everything we see in the world is the creative work of women.

```
##### Destination
```
EverythingWeSeeInTheWorldIsTheCreativeWorkOfWomen.
```

## Collection Utils

### listify
Converts lines to a list representation
#### Example
##### Source
```
1922 Sultanate abolished (November 1).
1923 Treaty of Lausanne secured (July 24). Republic of Turkey with capital at Ankara proclaimed (October 29).
1924 Caliphate abolished (March 3). Traditional religious schools closed, Sheriat (Islamic Law) abolished. Constitution adopted (April 20).
1925 Dervish brotherhoods abolished. Fez outlawed by the Hat Law (November 25). Veiling of women discouraged; Western clothing for men and women encouraged. Western (Gregorian) calendar adopted instead of Islamic calendar.
1926 New civil, commercial, and penal codes based on European models adopted. New civil code ended Islamic polygamy and divorce by renunciation and introduced civil marriage. Millet system ended.
1927 First systematic census.
1928 New Turkish alphabet (modified Latin form) adopted. State declared secular (April 10); constitutional provision establishing Islam as official religion deleted.
1933 Islamic call to worship and public readings of the Quran required to be in Turkish rather than Arabic.
1934 Women given the vote and the right to hold office. Law of Surnames adopted - Mustafa Kemal given the name Kemal Atatürk (Father of the Turks) by the Grand National Assembly; Ismet Pasha took surname of Inönü.
1935 Sunday adopted as legal weekly holiday. State role in managing economy written into the Constitution.
```
##### Destination
```python
[
    "1922 Sultanate abolished (November 1).",
    "1923 Treaty of Lausanne secured (July 24). Republic of Turkey with capital at Ankara proclaimed (October 29).",
    "1924 Caliphate abolished (March 3). Traditional religious schools closed, Sheriat (Islamic Law) abolished. Constitution adopted (April 20).",
    "1925 Dervish brotherhoods abolished. Fez outlawed by the Hat Law (November 25). Veiling of women discouraged; Western clothing for men and women encouraged. Western (Gregorian) calendar adopted instead of Islamic calendar.",
    "1926 New civil, commercial, and penal codes based on European models adopted. New civil code ended Islamic polygamy and divorce by renunciation and introduced civil marriage. Millet system ended.",
    "1927 First systematic census.",
    "1928 New Turkish alphabet (modified Latin form) adopted. State declared secular (April 10); constitutional provision establishing Islam as official religion deleted.",
    "1933 Islamic call to worship and public readings of the Quran required to be in Turkish rather than Arabic.",
    "1934 Women given the vote and the right to hold office. Law of Surnames adopted - Mustafa Kemal given the name Kemal Atat\u00fcrk (Father of the Turks) by the Grand National Assembly; Ismet Pasha took surname of In\u00f6n\u00fc.",
    "1935 Sunday adopted as legal weekly holiday. State role in managing economy written into the Constitution."
]

```

## Parsers
### url parse
Parses url into json
#### Example
##### Source
```
https://en.wikipedia.org/wiki/Atat%C3%BCrk%27s_Reforms?love=ataturk
```
##### Destination
```json
{
    "origin": "en.wikipedia.org",
    "path": "/wiki/Atat%C3%BCrk%27s_Reforms",
    "query": {
        "love": [
            "ataturk"
        ]
    }
}

```

### Other
## remove duplicate lines
#### Example
##### Source
```
Ataturk
Mustafa
Kemal
Ataturk
Ataturk
Kemal
Kemal
```
##### Destination
```
Ataturk
Kemal
Mustafa
```
### sort the lines
Sorts the lines
#### Example
##### Source
```
Ataturk
Mustafa
Kemal
Ataturk
Ataturk
Kemal
Kemal
```
##### Destination
```
Ataturk
Ataturk
Ataturk
Kemal
Kemal
Kemal
Mustafa
```


### trim the lines
Trims the lines
#### Example
##### Source
```
    Ataturk
 Mustafa
Kemal
Ataturk 
Ataturk
    Kemal
Kemal
```
##### Destination
```
Ataturk
Mustafa
Kemal
Ataturk
Ataturk
Kemal
Kemal
```