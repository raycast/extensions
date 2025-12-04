```fortran
subroutine zswap (
        integer n,
        complex*16, dimension(*) zx,
        integer incx,
        complex*16, dimension(*) zy,
        integer incy
)
```

ZSWAP interchanges two vectors.

## Parameters
N : INTEGER [in]
> number of elements in input vector(s)

ZX : COMPLEX\*16 array, dimension ( 1 + ( N - 1 )\*abs( INCX ) ) [in,out]

INCX : INTEGER [in]
> storage spacing between elements of ZX

ZY : COMPLEX\*16 array, dimension ( 1 + ( N - 1 )\*abs( INCY ) ) [in,out]

INCY : INTEGER [in]
> storage spacing between elements of ZY
