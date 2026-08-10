```fortran
subroutine spbtf2 (
        character uplo,
        integer n,
        integer kd,
        real, dimension( ldab, * ) ab,
        integer ldab,
        integer info
)
```

SPBTF2 computes the Cholesky factorization of a real symmetric
positive definite band matrix A.

The factorization has the form
A = U\*\*T \* U ,  if UPLO = 'U', or
A = L  \* L\*\*T,  if UPLO = 'L',
where U is an upper triangular matrix, U\*\*T is the transpose of U, and
L is lower triangular.

This is the unblocked version of the algorithm, calling Level 2 BLAS.

## Parameters
UPLO : CHARACTER\*1 [in]
> Specifies whether the upper or lower triangular part of the
> symmetric matrix A is stored:
> = 'U':  Upper triangular
> = 'L':  Lower triangular

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

KD : INTEGER [in]
> The number of super-diagonals of the matrix A if UPLO = 'U',
> or the number of sub-diagonals if UPLO = 'L'.  KD >= 0.

AB : REAL array, dimension (LDAB,N) [in,out]
> On entry, the upper or lower triangle of the symmetric band
> matrix A, stored in the first KD+1 rows of the array.  The
> j-th column of A is stored in the j-th column of the array AB
> as follows:
> if UPLO = 'U', AB(kd+1+i-j,j) = A(i,j) for max(1,j-kd)<=i<=j;
> if UPLO = 'L', AB(1+i-j,j)    = A(i,j) for j<=i<=min(n,j+kd).
> 
> On exit, if INFO = 0, the triangular factor U or L from the
> Cholesky factorization A = U\*\*T\*U or A = L\*L\*\*T of the band
> matrix A, in the same storage format as A.

LDAB : INTEGER [in]
> The leading dimension of the array AB.  LDAB >= KD+1.

INFO : INTEGER [out]
> = 0: successful exit
> < 0: if INFO = -k, the k-th argument had an illegal value
> > 0: if INFO = k, the leading principal minor of order k
> is not positive, and the factorization could not be
> completed.
