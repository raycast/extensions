```fortran
complex*16 function zdotc (
        integer n,
        complex*16, dimension(*) zx,
        integer incx,
        complex*16, dimension(*) zy,
        integer incy
)
```

ZDOTC forms the dot product of two complex vectors
ZDOTC = X^H \* Y

## Parameters
N : INTEGER [in]
> number of elements in input vector(s)

ZX : COMPLEX\*16 array, dimension ( 1 + ( N - 1 )\*abs( INCX ) ) [in]

INCX : INTEGER [in]
> storage spacing between elements of ZX

ZY : COMPLEX\*16 array, dimension ( 1 + ( N - 1 )\*abs( INCY ) ) [in]

INCY : INTEGER [in]
> storage spacing between elements of ZY
