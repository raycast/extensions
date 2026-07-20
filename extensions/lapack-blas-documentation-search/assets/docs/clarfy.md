```fortran
subroutine clarfy (
        character uplo,
        integer n,
        complex, dimension( * ) v,
        integer incv,
        complex tau,
        complex, dimension( ldc, * ) c,
        integer ldc,
        complex, dimension( * ) work
)
```

CLARFY applies an elementary reflector, or Householder matrix, H,
to an n x n Hermitian matrix C, from both the left and the right.

H is represented in the form

H = I - tau \* v \* v'

where  tau  is a scalar and  v  is a vector.

If  tau  is  zero, then  H  is taken to be the unit matrix.

## Parameters
UPLO : CHARACTER\*1 [in]
> Specifies whether the upper or lower triangular part of the
> Hermitian matrix C is stored.
> = 'U':  Upper triangle
> = 'L':  Lower triangle

N : INTEGER [in]
> The number of rows and columns of the matrix C.  N >= 0.

V : COMPLEX array, dimension [in]
> (1 + (N-1)\*abs(INCV))
> The vector v as described above.

INCV : INTEGER [in]
> The increment between successive elements of v.  INCV must
> not be zero.

TAU : COMPLEX [in]
> The value tau as described above.

C : COMPLEX array, dimension (LDC, N) [in,out]
> On entry, the matrix C.
> On exit, C is overwritten by H \* C \* H'.

LDC : INTEGER [in]
> The leading dimension of the array C.  LDC >= max( 1, N ).

WORK : COMPLEX array, dimension (N) [out]
