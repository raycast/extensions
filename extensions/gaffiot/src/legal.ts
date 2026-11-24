/**
 * Mentions légales relatives aux données du Gaffiot 2016.
 * Texte des conditions repris tel quel de la notice de G. Gréco
 * (http://gerardgreco.free.fr/spip.php?article47) via Gaffiot/digital-gaffiot-json.
 */

export const GAFFIOT_SOURCE_URL = "http://gerardgreco.free.fr/spip.php?article47";
export const GAFFIOT_HOME_URL = "http://gerardgreco.free.fr/spip.php?article12";
export const GAFFIOT_JSON_URL = "https://github.com/Gaffiot/digital-gaffiot-json";
/** Fichier source épinglé sur le dernier commit (24 octobre 2017) : contenu stable, date d'attribution exacte. */
export const GAFFIOT_JSON_RAW_URL =
  "https://raw.githubusercontent.com/Gaffiot/digital-gaffiot-json/61573a21807d9d97d0888c5ef5015a85dab7cfde/gaffiot.json";
export const CC_LICENSE_URL = "https://creativecommons.org/licenses/by-nc-nd/4.0/";

export const GAFFIOT_CREDITS = {
  title: "Dictionnaire illustré latin-français (Gaffiot 2016)",
  edition: "komarov-1.1 version of May 2, 2016",
  copyright: "© Gérard Gréco — 2015-2016",
  authors: "Gérard Gréco, Mark De Wilde, Bernard Maréchal and Katsuhiko Ôkubo",
  original: "Dictionnaire illustré latin-français, Hachette, 1934",
  sourceDate: "October 24, 2017",
  sourceFile: "October 24, 2017 (JSON conversion by Gaffiot/digital-gaffiot-json, commit 61573a2)",
  license: "Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International (CC BY-NC-ND 4.0)",
};

export const LEGAL_MARKDOWN = `# Legal Notice — Gaffiot 2016

## Work and Authors

**${GAFFIOT_CREDITS.title}**, ${GAFFIOT_CREDITS.edition}.
${GAFFIOT_CREDITS.copyright}.
Authors of the electronic resource: **${GAFFIOT_CREDITS.authors}**.

Revised and corrected edition of Félix Gaffiot's *${GAFFIOT_CREDITS.original}* (Gaffiot, 1870-1937, whose original text is in the public domain).

Structured electronic resource protected by the French Intellectual Property Code (database producers' rights, art. L341-1 et seq.).

## Data License

**${GAFFIOT_CREDITS.license}**
${CC_LICENSE_URL}

Conditions set by Gérard Gréco (full text, in French):

> Gérard Gréco met à disposition cette ressource électronique structurée, protégée par le code de la propriété intellectuelle sur les bases de données (L341-1), selon les termes de la licence Creative Commons : « Attribution-NonCommercial-NoDerivatives 4.0 International ». Les organisations Wikipedia, Wiktionary, Wikisources et similaires sont exclues du bénéfice de cette licence. Toute autorisation au-delà du champ de cette licence doit être obtenue auprès de nous.
>
> **Pas d'utilisation commerciale** : nous souhaitons encourager l'utilisation et l'amélioration de nos ressources électroniques, pour les intérêts de l'enseignement et de la recherche.
>
> **Pas de modification** : afin de mieux servir la communauté scientifique, nous tâcherons de conserver et à toujours offrir publiquement la version la plus à jour de nos ressources électroniques. Nous tâcherons de les corriger et de les améliorer, d'intégrer les contributions qui nous auront été soumises (après validation par un comité scientifique), et à référencer l'origine de ces contributions. Toute modification de la ressource qui ne serait pas reversée à la version de référence sous notre autorité éditoriale doit faire l'objet d'un accord, afin de ne pas disperser les contributions et de permettre les meilleures conditions possibles de collaboration scientifique.
>
> **Paternité** : nous demandons à ce que toute publication dérivée de ces ressources électroniques comporte : un lien vers l'adresse de la dernière version de la ressource sur notre site ; la date du fichier source utilisé ; le nom des auteurs : Gérard Gréco, Mark De Wilde, Bernard Maréchal et Katsuhiko Ôkubo.

## Attribution (as required by the authorship clause)

- Latest version of the resource: ${GAFFIOT_SOURCE_URL}
- Source file used: ${GAFFIOT_CREDITS.sourceFile} — ${GAFFIOT_JSON_URL}
- Authors: ${GAFFIOT_CREDITS.authors}

## About This Extension

- The extension **does not include or redistribute the dictionary data**. On first launch, it downloads the source file directly from ${GAFFIOT_JSON_URL} to your Mac, where it is kept for offline use.
- The dictionary **text is not modified**. Only its typesetting markup (TeX) is converted to Markdown for display, locally on your Mac; entries are not abridged, corrected or supplemented.
- Personal, **non-commercial** use (study and research), as permitted by the CC BY-NC-ND 4.0 license and the conditions above.
- Errors found in an entry should be reported to the editor of the reference resource, not corrected locally.
- The extension's code is released under the MIT license; the dictionary data remains governed by the CC BY-NC-ND 4.0 license above.
`;
