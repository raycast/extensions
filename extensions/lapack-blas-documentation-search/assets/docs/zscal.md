```fortran
subroutine zscal (
        integer n,
        complex*16 za,
        complex*16, dimension(*) zx,
        integer incx
)
```

ZSCAL scales a vector by a constant.

## Parameters
N : INTEGER [in]
> number of elements in input vector(s)

ZA : COMPLEX\*16 [in]
> On entry, ZA specifies the scalar alpha.

ZX : COMPLEX\*16 array, dimension ( 1 + ( N - 1 )\*abs( INCX ) ) [in,out]

INCX : INTEGER [in]
> storage spacing between elements of ZX
