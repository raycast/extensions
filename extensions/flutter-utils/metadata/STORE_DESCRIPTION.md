## Flutter Utils – Description Store

Flutter Utils offre un accès rapide aux commandes Flutter courantes directement depuis Raycast. Lancez `flutter run`, exécutez `pub get`, nettoyez avec `clean`, analysez et testez votre projet, construisez pour plusieurs cibles (`apk`, `appbundle`, `ios`) et consultez le diagnostic `doctor` — le tout via une interface unifiée.

### Points forts

- Sélecteur d’action unique avec formulaire d’arguments
- Sélection de device pour `flutter run`
- Suivi de progression et logs en direct avec mise en évidence des statuts
- Exécution interactive dans un terminal (Warp prioritaire, repli sur Terminal.app)
- Résolution flexible du chemin projet et du SDK Flutter via préférences

### Cas d’usage

- Démarrer rapidement une session `flutter run` sur un device spécifique
- Installer les dépendances (`pub get`) ou nettoyer l’artefact (`clean`)
- Analyser, tester et construire sans quitter Raycast
- Diagnostiquer l’environnement avec `doctor`

### Configuration

- Préférences: `Project Path` (optionnel), `Flutter SDK Path` (optionnel)
- Icône: `assets/extension-icon.png`

### Notes

L’extension gère les erreurs, nettoie les processus, et optimise les workflows macOS. Les commandes simples peuvent s’exécuter en arrière‑plan; `flutter run` privilégie une session terminal interactive.

