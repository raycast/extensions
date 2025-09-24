# Flutter Utils

Extension Raycast pour exécuter rapidement des commandes Flutter courantes.

## Commandes disponibles

- Flutter: commande unifiée listant les actions et permettant d'ajouter des arguments.
- Flutter Run: ouvre un terminal et lance `flutter run` (sélection de device possible).
- Flutter Pub Get: exécute `flutter pub get`.
- Flutter Clean: exécute `flutter clean`.
- Flutter Analyze: exécute `flutter analyze` (args possibles: `--fatal-infos`, `--fatal-warnings`).
- Flutter Test: exécute `flutter test` (args possibles: `--coverage`, `-r expanded`).
- Flutter Build APK: `flutter build apk` (args possibles: `--release`, `--flavor prod`).
- Flutter Build AppBundle: `flutter build appbundle`.
- Flutter Build iOS: `flutter build ios`.
- Flutter Doctor: `flutter doctor`.

## Préférences

- Project Path (optionnel): chemin absolu vers votre projet Flutter. Si laissé vide, vous pouvez sélectionner un dossier de projet dans le Finder et lancer la commande.
- Flutter SDK Path (optionnel): chemin absolu vers le dossier racine du SDK Flutter (contenant `bin`). Si renseigné, l’extension utilisera ce binaire précisément, utile si `flutter` n’est pas dans le PATH.
  
  Autorisez Raycast dans Réglages Système → Confidentialité et sécurité → Accessibilité pour permettre l'automatisation du terminal (Warp).

## Prérequis

- macOS
- Flutter installé et disponible dans le PATH du shell (ou configurez votre shell pour Terminal.app).

## Utilisation

1. Ouvrez Raycast.
2. Recherchez "Flutter" puis choisissez l'action souhaitée. Vous pouvez ajouter des arguments optionnels (ex: `--flavor prod`, `-d ios`).
3. Alternativement, utilisez directement: "Flutter Run", "Flutter Pub Get", "Flutter Clean".
3. Si nécessaire, renseignez la préférence `Project Path` dans les préférences de l’extension.

## Installation

### Depuis le Raycast Store

- Ouvrez Raycast → Store → recherchez "Flutter Utils" → Installez.

### Depuis la source (développement)

1. Clonez ce dépôt.
2. Installez les dépendances: `npm install`.
3. Lancez en mode développement: `npm run dev`.
4. Construisez l’extension: `npm run build`.

## Développement

- Installer les deps: `npm install`
- Lancer en dev: `npm run dev`
- Linter: `npm run lint`
