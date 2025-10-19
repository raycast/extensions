```fortran
subroutine caxpy (
        integer n,
        complex ca,
        complex, dimension(*) cx,
        integer incx,
        complex, dimension(*) cy,
        integer incy
)
```

CAXPY constant times a vector plus a vector.

## Parameters
N : INTEGER [in]
> number of elements in input vector(s)

CA : COMPLEX [in]
> On entry, CA specifies the scalar alpha.

CX : COMPLEX array, dimension ( 1 + ( N - 1 )\*abs( INCX ) ) [in]

INCX : INTEGER [in]
> storage spacing between elements of CX

CY : COMPLEX array, dimension ( 1 + ( N - 1 )\*abs( INCY ) ) [in,out]

INCY : INTEGER [in]
> storage spacing between elements of CY
