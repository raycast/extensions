# Image rendering comparison

Same Twemoji source, 24 columns and 12 rows per result. Shape matching is a research prototype, not a shipped style. Unicode Dots is the implemented higher-detail option.

## Current brightness ASCII

```text
      ...::::::...
    .::::::::::::::.
  .::::::::::::::::::.
 ::::::++::::::++::::::
.:::::+**+::::+**+:::::.
:::::::++::::::++:::::::
:::::---::::::::---:::::
.:::-*=-========-=*-:::.
 ::::+**=-::::-=**+::::
  .:::-+********+-:::.
    .:::::----:::::.
      ...::::::...
```

## Experimental glyph-shape matching

```text
      .:::!!!!:::.
    :!!!!!!!!!!!!!!:
  :!!!!!!!!!!!!!!!!!!:
 :!!!!|ag;!!!!|ag;!!!!:
!!!!!!$QQE!!!!$QQE!!!!!:
!!!!!!!VV]!!!!!VV]!!!!!!
!!!!!j_j:!!!!!!|j_j!!!!!
!!!!|QI"YYYYYYYY"IQt!!!
 !!!!9Q&u______a@QF!!!!
  !!!!?VQQQQQQQ8V]!!!'
    !!!!!!?""^]!!!!'
       '!!!!!!!!'`
```

## Unicode Dots with Floyd-Steinberg dithering

```text
⠀⠀⠀⠀⠀⠀⠀⡀⠄⠄⢂⢐⢀⠂⠄⠄⡀⡀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠠⠠⢁⠐⡐⠈⠄⡐⠠⠈⢄⠡⠐⡀⡂⠄⠀⠀⠀⠀
⠀⠀⠀⠌⠄⡁⢂⠂⢂⠡⠁⠄⠡⢁⠂⠄⠡⡀⠂⠌⠨⢀⠀⠀
⠀⠠⠁⠅⠂⡂⢂⡮⡦⡂⠡⠨⠈⠄⢢⢵⣱⡀⠅⡁⠅⡐⠠⠀
⠠⠨⠠⠁⠅⡀⡳⡽⡽⡕⠁⠌⠄⠅⡺⣵⡳⡇⢂⢐⠐⠠⠁⠄
⠐⡈⠄⡁⡂⠂⠌⠫⠫⠊⡈⡐⠈⠄⡘⢚⢚⢁⢂⠐⡈⠄⡑⠠
⠐⡀⡂⠂⠄⣅⣅⢅⣁⢂⢐⠠⢁⠅⡐⣀⡢⣠⢢⠐⠠⠁⠄⡁
⠐⡀⢂⠁⢍⡾⣈⠓⠙⠙⠝⠙⠓⠫⠋⠓⠙⡨⡯⡃⡁⠡⠁⠄
⠀⠐⢐⠈⠄⠫⣗⣗⣤⢤⣀⣄⣠⢠⣠⢴⣪⢯⠫⢀⠂⠡⠈⠀
⠀⠀⠂⠨⠠⢁⠊⠺⢮⢯⢞⣞⢮⣻⣪⢟⠎⢃⢁⠂⠌⠈⠀⠀
⠀⠀⠀⠈⠐⠠⠨⠈⠄⠡⢉⠊⠍⠌⠂⡂⠌⡀⡂⠈⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠁⠈⠨⠈⠄⠌⡐⢈⠐⠀⠂⠀⠀⠀⠀⠀⠀⠀
```

The simple six-region glyph prototype is not a demonstrated improvement over the baseline for this small emoji. It needs a richer font model and contrast tuning before integration. Unicode Dots preserves more subcell detail at the same character count.

Sources: [shape matching](https://alexharri.com/blog/ascii-rendering), [Braille conversion and dithering](https://github.com/TheZoraiz/ascii-image-converter), [Unicode Braille patterns](https://www.unicode.org/charts/nameslist/n_2800.html).
