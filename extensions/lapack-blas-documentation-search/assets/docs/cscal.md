```fortran
subroutine cscal (
        integer n,
        complex ca,
        complex, dimension(*) cx,
        integer incx
)
```

CSCAL scales a vector by a constant.

## Parameters
N : INTEGER [in]
> number of elements in input vector(s)

CA : COMPLEX [in]
> On entry, CA specifies the scalar alpha.

CX : COMPLEX array, dimension ( 1 + ( N - 1 )\*abs( INCX ) ) [in,out]

INCX : INTEGER [in]
> storage spacing between elements of CX
