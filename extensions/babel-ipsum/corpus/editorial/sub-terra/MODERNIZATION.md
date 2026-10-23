# Criterio de modernización de Sub terra

Esta capa editorial se aplica a los trece cuentos de `original.json`, extraídos de las páginas de Wikisource conservadas en `.cache/corpus/sources/sub-terra/`. El texto extraído sigue siendo el testimonio de entrada: las correcciones no se escriben sobre él ni sobre las copias HTML.

El propósito es ofrecer el texto con ortografía y acentuación españolas actuales, conservando el vocabulario, las construcciones gramaticales, la narración y los diálogos. No es una edición crítica ni acredita un cotejo completo con los impresos de 1904 y 1917.

## Reglas de intervención

- Se modernizan grafías históricas concretas: `i` → `y`, `mui` → `muy`, `jeneral` → `general`, `estraccion` → `extracción`, `espresion` → `expresión`. No se aplica una sustitución general de letras: se conservan, por ejemplo, `jirones`, `cojeaba` y `estruendo`.
- Se restituyen tildes omitidas y se eliminan las que ya no corresponden: `habia` → `había`, `filon` → `filón`, `fué` → `fue`, `dió` → `dio`, `ménos` → `menos`, `entónces` → `entonces`. Se escriben `solo` y los demostrativos sin tilde.
- Las formas con pronombres enclíticos conservan su construcción y reciben la acentuación de la palabra resultante: `dióse` → `diose`, `acercóse` → `acercose`, `parecióle` → `pareciole`. Formas correctas como `díjole`, `púsose`, `animáronse` y `habíale` se conservan.
- Los valores que dependen del sentido se resuelven en su párrafo. No hay reglas globales para `mas`, `aun`, `si`, `el`, `mi`, `tu`, `hacia`, `seria`, `sabia`, `como`, `que`, `quien` o `donde`. Así se distinguen el adversativo `mas` de `más`, la preposición `hacia` del verbo `hacía`, y `sabia erudición` de `Nadie sabía quién era`.
- Se conservan voces y variantes como `fierro`, `yerba`, `calofrío`, `trasparencia`, `trasfiguraba`, `trascurrido`, `taima`, `denantes`, `huasca`, `guaguas` y `pescao`. No se sustituye una palabra por un sinónimo moderno ni se regulariza el habla de los personajes.
- Las erratas de lectura inequívocas se identifican por contexto: palabras pegadas o partidas, letras confundidas, repeticiones accidentales y nombres deteriorados. Por ejemplo: `carroi` → `carro y`, `rechi, naron` → `rechinaron`, `los in jeme ros` → `los ingenieros`, y las lecturas `Canuela`, `Carmela` y `Canada` cuando designan a Cañuela.
- Se conserva la puntuación y la disposición verbal de los diálogos. La excepción es la eliminación de signos que fragmentan una palabra inequívoca, como las comas interiores de `rechi, naron` y `acha, có`. No se añaden signos de apertura ni se regularizan comas, rayas, mayúsculas o puntos suspensivos de la fuente.

## Archivos y orden de aplicación

`corrections.json` contiene **811 pares exactos** de palabra de entrada en minúscula y grafía moderna. El preparador de Sub terra aplica cada par una sola vez sobre palabras completas, conservando las mayúsculas iniciales o totales. No debe iterar las reglas hasta alcanzar un punto fijo: `rió` se moderniza como `rio`, mientras que el `rio` que designa el curso de agua se acentúa como `río` en el testimonio de entrada.

`edits.json` contiene **366 intervenciones contextuales**, cada una con cuento, párrafo numerado desde 1, búsqueda literal, reemplazo y motivo. Se aplican después de las reglas globales y en el orden del archivo. Una búsqueda puede contener una corrección contextual anterior del mismo párrafo. Cada búsqueda debe aparecer exactamente una vez en el estado al que se aplica; una coincidencia ausente o repetida debe detener la construcción.

La revisión cubrió las **9.363 entradas del vocabulario extraído**, con comprobación contextual de las grafías dudosas y de los usos diacríticos detectados. Esa revisión de vocabulario no equivale a una corrección filológica completa de cada oración. Los 13 cuentos contienen 878 párrafos en esta extracción; cambiar sus límites exige volver a comprobar las referencias de las ediciones contextuales.

## Cotejo visual y límites de la auditoría

Los pasajes dudosos señalados durante la revisión se cotejaron visualmente con ocho imágenes del impreso. Se conservan las imágenes, enlaces y resultados en [SCANS.md](SCANS.md). Los números de párrafo siguientes remiten a `original.json`:

- **El grisú, 151:** el impreso dice `era imposible conservara un resto de vida`. Se restituye `era`, mal transcrito como `es`; se conserva `conservara`, que también aparece así en el impreso, sin reconstruir su gramática.
- **Caza mayor, 11 y 23:** el impreso confirma `la mira` y `los bóquil`. Se conservan sin conjeturar otras palabras ni regularizar su número.
- **Juan Fariña, 30 y 60:** el impreso confirma `inmoble` y `Maelstron`. Se conservan como lecturas del testimonio.
- **Cañuela y Petaca, 7:** se restituye `emprendiendo`, leído incorrectamente como `emprendime`.
- **Cañuela y Petaca, 36:** se restituye `pólvora estuviera chueca`; la palabra en cursiva del impreso no dice `altura`.
- **Cañuela y Petaca, 38:** se restituyen las lecturas impresas `señaló`, `surcaron` y `fabricaría`, esta última con la tilde actual.

También permanecen las discordancias gramaticales y las anomalías de puntuación que no permiten identificar una errata inequívoca. Por ejemplo, no se convierte automáticamente toda discordancia de género o número en una corrección. Las voces extranjeras no reciben una adaptación léxica general; las correcciones locales de `wiskey` y `jentleman` restituyen su grafía inglesa.

La validación mecánica comprueba que los datos son aplicables, no que cada decisión editorial sea definitiva. El cotejo de estos pasajes concretos no constituye una revisión visual íntegra de los dos libros.
