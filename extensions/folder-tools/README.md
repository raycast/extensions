# Folder Tools Raycast Extension

Extension generica de Raycast para ejecutar la misma logica de analisis y comandos sobre cualquier carpeta, sin depender de una asignatura concreta.

## Diferencia con UPSA Stack

- UPSA Stack: orientada a Tecnologias Moviles, MAUI, Obsidian UPSA, simulacros y scripts de examen.
- Folder Tools: orientada a carpetas arbitrarias, repos personales, documentacion, clientes, investigaciones o proyectos no universitarios.

## Comandos incluidos

- Folder Tools: dashboard generico.
- Analyze Folder: formulario para graphify, Understand-Anything y agent-brain.
- Install GitHub Tools: instalador de tres repos GitHub en un target indicado.
- Run Terminal Command: ejecuta cualquier comando en un cwd elegido.

## Preferencias

- Tools Root: normalmente /Users/dalonsogomez/Developer/UPSA/.github-tools.
- Default Target Folder: cualquier carpeta base.
- Install Tools Script: script install-github-tools.sh generico.
- Neo4j URL: URL del browser de Neo4j.
- Terminal App: Terminal o iTerm.

## Desarrollo

~~~bash
cd /Users/dalonsogomez/Developer/UPSA/raycast/folder-tools
npm install
npm run lint
npm run typecheck
npm run build
~~~

Para abrirla en Raycast:

~~~bash
npm run dev
~~~
