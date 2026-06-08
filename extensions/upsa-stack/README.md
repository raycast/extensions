# UPSA Stack Raycast Extension

Extension local de Raycast para ejecutar desde UI las mismas funciones del stack UPSA que ya existen en terminal.

## Comandos incluidos

- UPSA Stack: dashboard principal con acciones rapidas.
- Run Folder: formulario para ejecutar run-folder.sh sobre cualquier carpeta.
- Install GitHub Tools: formulario para instalar tres herramientas GitHub en un target.
- Run Terminal Command: formulario para ejecutar cualquier comando en un cwd elegido.

## Acciones principales

- Preparacion completa UPSA.
- Instalacion/actualizacion del graph stack UPSA.
- Run Folder: recommended, status, graphify-detect, graphify-extract, graphify-query, graphify-tree.
- Understand-Anything: info y dashboard.
- agent-brain/Neo4j: up, prepare, index, down.
- Run simulacro 01.
- Start Flowise.
- Flowise prediction.
- Build MAUI smoke MacCatalyst.
- Abrir Obsidian, logs, Neo4j y READMEs.
- Ejecutar comando arbitrario dentro del workspace UPSA en Terminal o capturando salida en Raycast.

## Relacion con terminal

La extension no sustituye los scripts: los envuelve.

- Comandos largos o interactivos: se abren en Terminal/iTerm.
- Comandos rapidos: se pueden capturar dentro de Raycast y copiar salida/comando.
- El comando Run Terminal Command permite lanzar manualmente cualquier comando que tambien escribirias en terminal.

## Desarrollo

~~~bash
cd /Users/dalonsogomez/Developer/UPSA/raycast/upsa-stack
npm install
npm run lint
npm run typecheck
npm run build
~~~

Para abrirla en Raycast en modo desarrollo:

~~~bash
npm run dev
~~~

## Preferencias

- UPSA Directory: /Users/dalonsogomez/Developer/UPSA
- Default Target Folder: /Users/dalonsogomez/Developer/UPSA/_obsidian/60_Preparacion_Ordenador_MAUI
- Terminal App: Terminal o iTerm

## Base tecnica

Estructura contrastada con ejemplos oficiales:

- https://github.com/raycast/extensions/tree/main/examples/api-examples
- https://github.com/raycast/extensions/tree/main/examples/todo-list
