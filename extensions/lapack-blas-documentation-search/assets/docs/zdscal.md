```fortran
subroutine zdscal (
        integer n,
        double precision da,
        complex*16, dimension(*) zx,
        integer incx
)
```

ZDSCAL scales a vector by a constant.

## Parameters
N : INTEGER [in]
> number of elements in input vector(s)

DA : DOUBLE PRECISION [in]
> On entry, DA specifies the scalar alpha.

ZX : COMPLEX\*16 array, dimension ( 1 + ( N - 1 )\*abs( INCX ) ) [in,out]

INCX : INTEGER [in]
> storage spacing between elements of ZX
