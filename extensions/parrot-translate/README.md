<p align="center">
  <strong>raycast-Parrot</strong>
</p>
<p align="center">A Raycast translation Extension, Powerful and Easy to use. </p>
<p align="center">đşđ¸ đŹđ§ đŠđŞ đŤđˇ đ¨đł đŻđľ đˇđş đŞđ¸ đľđš đŹđˇ đŤđŽ đŚđˇ đŽđŠ đ¨đŚ đ°đˇ đŽđš đŚđŞ đłđ´ đ˛đ˝ đŽđą đ¸đ° đšđˇ đľđą đ¨đż đ­đş đ­đš đšđ­ đłđą đ¸đŞ đŚđş</p>

## Features

1. Supports 26+ languages.
2. Support Play TTS (Text to Speech)
3. Support Copy Auto Paste, also support **lowerCamelCase** and **ALL_UPPERCASE** copy mode.
4. Quick translation to another language
5. Use third-party dictionary queries. now we only support EuDic(ćŹ§čˇŻčŻĺ¸)

## Documents

### Copy

All copy items in Action Panel, you can click it or use `cmd` + `k` to expand it.

#### 1. lowerCamelCase

Use `>` before query text to copy translate results, for example: `> Hola`

#### 2. ALL_UPPERCASE

Use `>>` before query text to copy translate result, for example: `>> Hola`

### Support Languages & TTS(Text-to-Speech)

You can play Query Text and Results Text

| Language              | Voice                                                                                                   | Default |
| --------------------- | ------------------------------------------------------------------------------------------------------- | ------- |
| English               | đşđ¸ Alex đşđ¸ Fred đşđ¸ Samantha đşđ¸ Victoria đŹđ§ Daniel đŚđş Karen đŽđŞ Moira đŽđł Rishi đŽđł Veena đ´ó §ó ˘ó łó Łó ´ó ż Fiona đ Tessa | Alex    |
| Spanish               | đŞđ¸ Jorge đŞđ¸ Monica đŚđˇ Diego đ˛đ˝ Paulina                                                                  | Jorge   |
| đŽđš Italiana           | Alice, Luca                                                                                             | Alice   |
| đ¸đŞ Swedish            | Alva                                                                                                    | -       |
| đŤđˇ French             | Amelie, Thomas                                                                                          | Amelie  |
| đŠđŞ German             | Anna                                                                                                    | -       |
| đŽđą Hebrew             | Carmit                                                                                                  | -       |
| đŽđŠ Indonesia          | Damayanti                                                                                               | -       |
| đłđą Dutch              | Ellen, Xander                                                                                           | Ellen   |
| đˇđ´ Romanian           | Ioana                                                                                                   | -       |
| đľđš Portuguese         | Joana, Luciana                                                                                          | Joana   |
| đšđ­ Thai               | Kanya                                                                                                   | -       |
| đŻđľ Japan              | Kyoko                                                                                                   | -       |
| đ¸đ° Slovak             | Laura                                                                                                   | -       |
| đ­đš Hindi              | Lekha                                                                                                   | -       |
| đŚđŞ Arabic             | Maged                                                                                                   | -       |
| đ­đş Hungarian          | Mariska                                                                                                 | -       |
| đŹđˇ Greek              | Melina                                                                                                  | -       |
| đˇđş Russian            | Milena, Yuri                                                                                            | Milena  |
| đŠđ° Danish             | Sara                                                                                                    | -       |
| đŤđŽ Finnish            | Satu                                                                                                    | -       |
| đ¨đł Chinese-Simplified | Ting-Ting                                                                                               | -       |
| đšđˇ Turkish            | Yelda                                                                                                   | -       |
| đ°đˇ Korea              | Yuna                                                                                                    | -       |
| đľđą Polish             | Zosia                                                                                                   | -       |
| đ¨đż Czech              | Zuzana                                                                                                  | -       |

## Error Code Information

More error code information please visit [Youdao API Document (ä¸­ć)](https://ai.youdao.com/DOCSIRMA/html/čŞçśčŻ­č¨çżťčŻ/APIććĄŁ/ććŹçżťčŻćĺĄ/ććŹçżťčŻćĺĄ-APIććĄŁ.html)
or you can submit an issue.

| Code | Description                                                                                                                                                                                            |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 101  | Mandatory parameters are missing. Ensure that the required parameters are complete and that the parameters are written correctly                                                                       |
| 103  | Translated text is too long                                                                                                                                                                            |
| 108  | If the application ID is invalid, you can register an account, log in to the background, create an application and instance, and bind the application to obtain the application ID and application key |
| 112  | Invalid request service                                                                                                                                                                                |
| 207  | Replay request                                                                                                                                                                                         |
| 302  | Translation query failed                                                                                                                                                                               |
| 303  | Other exceptions on the server                                                                                                                                                                         |
| 411  | Access frequency limited, please visit later                                                                                                                                                           |
| 412  | Long requests are too frequent. Please visit later                                                                                                                                                     |

## Default Config

We provide the default token down below, but they maybe have a limit request server, so you should try registering your App-ID and App-Key go to [Youdao (ä¸­ć))](https://ai.youdao.com/#/)

App ID: _0d68776be7e9be0b_

App Key: _MIbu7DGsOPdbatL9KmgycGx0qDOzQWCM_
