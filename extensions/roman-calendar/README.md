# Roman Calendar

Convert Gregorian dates to Roman calendar dates and back, and explore the Roman name of every day in a month. The interface is in English; the date formulas themselves are in Latin.

## How the Roman calendar names a day

A Roman date is expressed relative to one of three fixed days in a month:

| Reference day | Latin name | Abbreviation | Day of the month                                                |
| ------------- | ---------- | ------------ | --------------------------------------------------------------- |
| Kalends       | _Kalendae_ | `Kal.`       | 1st of every month                                              |
| Nones         | _Nonae_    | `Non.`       | 7th in March, May, July, and October; 5th in all other months   |
| Ides          | _Idus_     | `Id.`        | 15th in March, May, July, and October; 13th in all other months |

The reference day itself is named directly: **1 March** is `Kalendae Martiae`. The day immediately before a reference uses **pridie**: **6 March** is `pridie Nonas Martias` (the day before the Nones of March).

For earlier days, Romans counted **inclusively**: both the starting day and the reference day count. **3 March** is five days before the Nones when counted inclusively (3, 4, 5, 6, 7), so its full form is `ante diem quintum Nonas Martias`; its short form is `a.d. V Non. Mart.` The count of two is always written as `pridie`, never `ante diem secundum`.

After the Ides, the next reference is the **Kalends of the following month**. For example, **22 September 2026** is `ante diem decimum Kalendas Octobres 2026 CE` or `a.d. X Kal. Oct. 2026 CE`. The year attached to a Roman formula belongs to its _reference month_: **31 December 2026** points to the Kalends of January **2027**.

### Leap years and years before the common era

In a leap year, **24 February** is the intercalary **bis sextum** day: `ante diem bis sextum Kalendas Martias` (`a.d. bis VI Kal. Mart.`). This is the second sixth day before the Kalends of March. The extension follows the same convention as the source application for the surrounding February dates.

The conversion uses the **proleptic Gregorian calendar** for every year, including ancient dates. It describes modern civil dates using the Gregorian rules projected backward; it does not reconstruct the historical Roman calendar as it was observed in antiquity. Years before the common era have **no year zero**: 1 BCE is followed immediately by 1 CE. For leap year calculations, 1 BCE corresponds to astronomical year 0. This distinction matters when converting dates near the BCE/CE boundary.

The supported civil years are **9999 BCE through 9999 CE**. A Roman date late in December 9999 CE can refer to the Kalends of January 10000 CE.

## Use in Raycast

Open **Roman Calendar** and choose a direction in the search bar menu:

- **Gregorian → Roman:** enter `21 April 753 BCE`, `21 April -753`, or `24 February 2024`. Leave the search field empty to show the selected day, initially today.
- **Roman → Gregorian:** enter a full or abbreviated Latin formula, such as `ante diem decimum Kalendas Octobres 2026`, `a.d. X Kal. Oct. 2026`, or `pridie Nonas Martias 2026`. If the year is omitted, the current year is assumed. The year is always the year of the Latin reference month.

The results show the Gregorian date, the full Latin form, and the abbreviated Latin form. Open the action panel to copy either form. The month list shows the Roman formula for every day; select a day to inspect it. Invalid or noncanonical formulas produce an error instead of an approximate date.

## Development

Install Node.js 22.14 or newer, then run `npm install` and `npm run dev`. Run `npm run build` to validate a distribution build.
