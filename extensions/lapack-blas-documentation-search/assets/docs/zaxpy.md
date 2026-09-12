```fortran
subroutine zaxpy (
        integer n,
        complex*16 za,
        complex*16, dimension(*) zx,
        integer incx,
        complex*16, dimension(*) zy,
        integer incy
)
```

ZAXPY constant times a vector plus a vector.

## Parameters
N : INTEGER [in]
> number of elements in input vector(s)

ZA : COMPLEX\*16 [in]
> On entry, ZA specifies the scalar alpha.

ZX : COMPLEX\*16 array, dimension ( 1 + ( N - 1 )\*abs( INCX ) ) [in]

INCX : INTEGER [in]
> storage spacing between elements of ZX

ZY : COMPLEX\*16 array, dimension ( 1 + ( N - 1 )\*abs( INCY ) ) [in,out]

INCY : INTEGER [in]
> storage spacing between elements of ZY
