```fortran
subroutine ztptri (
        character uplo,
        character diag,
        integer n,
        complex*16, dimension( * ) ap,
        integer info
)
```

ZTPTRI computes the inverse of a complex upper or lower triangular
matrix A stored in packed format.

## Parameters
UPLO : CHARACTER\*1 [in]
> = 'U':  A is upper triangular;
> = 'L':  A is lower triangular.

DIAG : CHARACTER\*1 [in]
> = 'N':  A is non-unit triangular;
> = 'U':  A is unit triangular.

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

AP : COMPLEX\*16 array, dimension (N\*(N+1)/2) [in,out]
> On entry, the upper or lower triangular matrix A, stored
> columnwise in a linear array.  The j-th column of A is stored
> in the array AP as follows:
> if UPLO = 'U', AP(i + (j-1)\*j/2) = A(i,j) for 1<=i<=j;
> if UPLO = 'L', AP(i + (j-1)\*((2\*n-j)/2) = A(i,j) for j<=i<=n.
> See below for further details.
> On exit, the (triangular) inverse of the original matrix, in
> the same packed storage format.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
> > 0:  if INFO = i, A(i,i) is exactly zero.  The triangular
> matrix is singular and its inverse can not be computed.
