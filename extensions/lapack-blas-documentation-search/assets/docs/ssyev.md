```fortran
subroutine ssyev (
        character jobz,
        character uplo,
        integer n,
        real, dimension( lda, * ) a,
        integer lda,
        real, dimension( * ) w,
        real, dimension( * ) work,
        integer lwork,
        integer info
)
```

SSYEV computes all eigenvalues and, optionally, eigenvectors of a
real symmetric matrix A.

## Parameters
JOBZ : CHARACTER\*1 [in]
> = 'N':  Compute eigenvalues only;
> = 'V':  Compute eigenvalues and eigenvectors.

UPLO : CHARACTER\*1 [in]
> = 'U':  Upper triangle of A is stored;
> = 'L':  Lower triangle of A is stored.

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

A : REAL array, dimension (LDA, N) [in,out]
> On entry, the symmetric matrix A.  If UPLO = 'U', the
> leading N-by-N upper triangular part of A contains the
> upper triangular part of the matrix A.  If UPLO = 'L',
> the leading N-by-N lower triangular part of A contains
> the lower triangular part of the matrix A.
> On exit, if JOBZ = 'V', then if INFO = 0, A contains the
> orthonormal eigenvectors of the matrix A.
> If JOBZ = 'N', then on exit the lower triangle (if UPLO='L')
> or the upper triangle (if UPLO='U') of A, including the
> diagonal, is destroyed.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

W : REAL array, dimension (N) [out]
> If INFO = 0, the eigenvalues in ascending order.

WORK : REAL array, dimension (MAX(1,LWORK)) [out]
> On exit, if INFO = 0, WORK(1) returns the optimal LWORK.

LWORK : INTEGER [in]
> The length of the array WORK.  LWORK >= max(1,3\*N-1).
> For optimal efficiency, LWORK >= (NB+2)\*N,
> where NB is the blocksize for SSYTRD returned by ILAENV.
> 
> If LWORK = -1, then a workspace query is assumed; the routine
> only calculates the optimal size of the WORK array, returns
> this value as the first entry of the WORK array, and no error
> message related to LWORK is issued by XERBLA.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
> > 0:  if INFO = i, the algorithm failed to converge; i
> off-diagonal elements of an intermediate tridiagonal
> form did not converge to zero.
