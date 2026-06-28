```fortran
subroutine ssygv (
        integer itype,
        character jobz,
        character uplo,
        integer n,
        real, dimension( lda, * ) a,
        integer lda,
        real, dimension( ldb, * ) b,
        integer ldb,
        real, dimension( * ) w,
        real, dimension( * ) work,
        integer lwork,
        integer info
)
```

SSYGV computes all the eigenvalues, and optionally, the eigenvectors
of a real generalized symmetric-definite eigenproblem, of the form
A\*x=(lambda)\*B\*x,  A\*Bx=(lambda)\*x,  or B\*A\*x=(lambda)\*x.
Here A and B are assumed to be symmetric and B is also
positive definite.

## Parameters
ITYPE : INTEGER [in]
> Specifies the problem type to be solved:
> = 1:  A\*x = (lambda)\*B\*x
> = 2:  A\*B\*x = (lambda)\*x
> = 3:  B\*A\*x = (lambda)\*x

JOBZ : CHARACTER\*1 [in]
> = 'N':  Compute eigenvalues only;
> = 'V':  Compute eigenvalues and eigenvectors.

UPLO : CHARACTER\*1 [in]
> = 'U':  Upper triangles of A and B are stored;
> = 'L':  Lower triangles of A and B are stored.

N : INTEGER [in]
> The order of the matrices A and B.  N >= 0.

A : REAL array, dimension (LDA, N) [in,out]
> On entry, the symmetric matrix A.  If UPLO = 'U', the
> leading N-by-N upper triangular part of A contains the
> upper triangular part of the matrix A.  If UPLO = 'L',
> the leading N-by-N lower triangular part of A contains
> the lower triangular part of the matrix A.
> 
> On exit, if JOBZ = 'V', then if INFO = 0, A contains the
> matrix Z of eigenvectors.  The eigenvectors are normalized
> as follows:
> if ITYPE = 1 or 2, Z\*\*T\*B\*Z = I;
> if ITYPE = 3, Z\*\*T\*inv(B)\*Z = I.
> If JOBZ = 'N', then on exit the upper triangle (if UPLO='U')
> or the lower triangle (if UPLO='L') of A, including the
> diagonal, is destroyed.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

B : REAL array, dimension (LDB, N) [in,out]
> On entry, the symmetric positive definite matrix B.
> If UPLO = 'U', the leading N-by-N upper triangular part of B
> contains the upper triangular part of the matrix B.
> If UPLO = 'L', the leading N-by-N lower triangular part of B
> contains the lower triangular part of the matrix B.
> 
> On exit, if INFO <= N, the part of B containing the matrix is
> overwritten by the triangular factor U or L from the Cholesky
> factorization B = U\*\*T\*U or B = L\*L\*\*T.

LDB : INTEGER [in]
> The leading dimension of the array B.  LDB >= max(1,N).

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
> > 0:  SPOTRF or SSYEV returned an error code:
> <= N:  if INFO = i, SSYEV failed to converge;
> i off-diagonal elements of an intermediate
> tridiagonal form did not converge to zero;
> > N:   if INFO = N + i, for 1 <= i <= N, then the leading
> principal minor of order i of B is not positive.
> The factorization of B could not be completed and
> no eigenvalues or eigenvectors were computed.
