# Métadonnées Raycast – Flutter Utils

Ce dossier contient les éléments destinés à la soumission au Raycast Store.

## Contenu attendu

- screenshots/ — captures d’écran de l’extension en action
- STORE_DESCRIPTION.md — description longue prête à copier dans la fiche Store

## Captures d’écran (screenshots)

Placez vos captures d’écran dans `metadata/screenshots/` et nommez-les avec un ordre explicite:

- `01-overview.png`
- `02-run-with-device-selection.png`
- `03-progress-and-logs.png`
- `04-analyze-test-build.png`
- `05-doctor.png`

Recommandations:

- Format PNG, grande résolution (retina), arrière‑plan propre
- Mode clair et/ou sombre selon le rendu le plus lisible
- Affichez des cas d’usage clés: sélection d’action, formulaire d’arguments, exécution, logs en direct, choix de device

## Conseils de conformité Store

- Mettez à jour `package.json` (champ `version`) à chaque livraison
- Tenez à jour `CHANGELOG.md` avec une entrée pour chaque version
- Vérifiez l’icône (`assets/icon.png`) et les textes (titre, description)

## Vérification rapide avant soumission

- [ ] Screenshots présents et pertinents
- [ ] Description longue relue (voir `STORE_DESCRIPTION.md`)
- [ ] `package.json` versionné correctement
- [ ] `CHANGELOG.md` à jour

