# Plan de Implementación: Logs de Tiempo Automáticos al Pausar/Detener

Este plan describe los cambios necesarios para que al pausar o terminar una tarea, se genere automáticamente una entrada de tiempo (worklog) en Jira.

## 1. Modificar Lógica de Almacenamiento (`src/utils/storage.ts`)

Actualmente, `pauseIssue` solo detiene el contador y acumula el tiempo localmente. Modificaremos esto para que functione como un "checkpoint": calcule el tiempo, lo devuelva para ser logueado, y reinicie el contador acumulado.

- **`pauseIssue`**:
    - Calcular `totalSeconds` = `elapsedSeconds` (acumulado previo) + tiempo sesión actual.
    - Guardar en LocalStorage: `elapsedSeconds: 0` (reinicio), `isRunning: false`, `startTime: 0`.
    - Retornar: `{ issueKey: string, timeSpentSeconds: number }`.

## 2. Actualizar Comando "Pause an issue" (`src/pause-an-issue.tsx`)

Actualmente, este comando solo muestra detalles y un botón simple de pausa. Lo convertiremos en un formulario similar a "Stop Issue" para permitir ingresar un comentario.

- **Cambiar UI**: De `Detail` a `Form`.
- **Campos**:
    - `TextArea` para "Comentario" (opcional).
- **Acción**:
    - Al enviar (`onSubmit`):
        1. Llamar a `pauseIssue()`.
        2. Si hay tiempo acumulado (> 0), llamar a `addWorklog()` con el tiempo y el comentario.
        3. Mostrar notificación de éxito ("Work logged & Paused").

## 3. Revisión de "Stop Issue" (`src/stop-issue.tsx`)

- La lógica actual de `stopIssue` elimina la entrada de `active-issue` del LocalStorage.
- Esto sigue siendo correcto. Si el usuario pausa (loguea tiempo) y luego detiene (sin trabajar más), el tiempo logueado será 0, lo cual es correcto. Si reanuda y luego detiene, logueará solo el nuevo segmento.

## Flujo Resultante

1. **Start Work (`start-issue`)**: Inicia contador (`startTime`, `elapsed: 0`).
2. **Pause Work (`pause-an-issue`)**:
    - Usuario ingresa comentario.
    - Se calcula tiempo X.
    - Se envía Worklog a Jira (X tiempo).
    - LocalStorage queda: `isRunning: false`, `elapsed: 0`.
3. **Resume Work (`start-issue` de nuevo)**:
    - Inicia contador (`startTime`, `elapsed: 0`).
4. **Stop Work (`stop-issue`)**:
    - Usuario ingresa comentario.
    - Se calcula tiempo Y.
    - Se envía Worklog a Jira (Y tiempo).
    - LocalStorage se limpia.

Este flujo asegura que cada intervalo trabajado se registre en Jira al momento de pausar o terminar.
