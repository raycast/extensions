```fortran
subroutine ctgsna (
        character job,
        character howmny,
        logical, dimension( * ) select,
        integer n,
        complex, dimension( lda, * ) a,
        integer lda,
        complex, dimension( ldb, * ) b,
        integer ldb,
        complex, dimension( ldvl, * ) vl,
        integer ldvl,
        complex, dimension( ldvr, * ) vr,
        integer ldvr,
        real, dimension( * ) s,
        real, dimension( * ) dif,
        integer mm,
        integer m,
        complex, dimension( * ) work,
        integer lwork,
        integer, dimension( * ) iwork,
        integer info
)
```

CTGSNA estimates reciprocal condition numbers for specified
eigenvalues and/or eigenvectors of a matrix pair (A, B).

(A, B) must be in generalized Schur canonical form, that is, A and
B are both upper triangular.

## Parameters
JOB : CHARACTER\*1 [in]
> Specifies whether condition numbers are required for
> eigenvalues (S) or eigenvectors (DIF):
> = 'E': for eigenvalues only (S);
> = 'V': for eigenvectors only (DIF);
> = 'B': for both eigenvalues and eigenvectors (S and DIF).

HOWMNY : CHARACTER\*1 [in]
> = 'A': compute condition numbers for all eigenpairs;
> = 'S': compute condition numbers for selected eigenpairs
> specified by the array SELECT.

SELECT : LOGICAL array, dimension (N) [in]
> If HOWMNY = 'S', SELECT specifies the eigenpairs for which
> condition numbers are required. To select condition numbers
> for the corresponding j-th eigenvalue and/or eigenvector,
> SELECT(j) must be set to .TRUE..
> If HOWMNY = 'A', SELECT is not referenced.

N : INTEGER [in]
> The order of the square matrix pair (A, B). N >= 0.

A : COMPLEX array, dimension (LDA,N) [in]
> The upper triangular matrix A in the pair (A,B).

LDA : INTEGER [in]
> The leading dimension of the array A. LDA >= max(1,N).

B : COMPLEX array, dimension (LDB,N) [in]
> The upper triangular matrix B in the pair (A, B).

LDB : INTEGER [in]
> The leading dimension of the array B. LDB >= max(1,N).

VL : COMPLEX array, dimension (LDVL,M) [in]
> IF JOB = 'E' or 'B', VL must contain left eigenvectors of
> (A, B), corresponding to the eigenpairs specified by HOWMNY
> and SELECT.  The eigenvectors must be stored in consecutive
> columns of VL, as returned by CTGEVC.
> If JOB = 'V', VL is not referenced.

LDVL : INTEGER [in]
> The leading dimension of the array VL. LDVL >= 1; and
> If JOB = 'E' or 'B', LDVL >= N.

VR : COMPLEX array, dimension (LDVR,M) [in]
> IF JOB = 'E' or 'B', VR must contain right eigenvectors of
> (A, B), corresponding to the eigenpairs specified by HOWMNY
> and SELECT.  The eigenvectors must be stored in consecutive
> columns of VR, as returned by CTGEVC.
> If JOB = 'V', VR is not referenced.

LDVR : INTEGER [in]
> The leading dimension of the array VR. LDVR >= 1;
> If JOB = 'E' or 'B', LDVR >= N.

S : REAL array, dimension (MM) [out]
> If JOB = 'E' or 'B', the reciprocal condition numbers of the
> selected eigenvalues, stored in consecutive elements of the
> array.
> If JOB = 'V', S is not referenced.

DIF : REAL array, dimension (MM) [out]
> If JOB = 'V' or 'B', the estimated reciprocal condition
> numbers of the selected eigenvectors, stored in consecutive
> elements of the array.
> If the eigenvalues cannot be reordered to compute DIF(j),
> DIF(j) is set to 0; this can only occur when the true value
> would be very small anyway.
> For each eigenvalue/vector specified by SELECT, DIF stores
> a Frobenius norm-based estimate of Difl.
> If JOB = 'E', DIF is not referenced.

MM : INTEGER [in]
> The number of elements in the arrays S and DIF. MM >= M.

M : INTEGER [out]
> The number of elements of the arrays S and DIF used to store
> the specified condition numbers; for each selected eigenvalue
> one element is used. If HOWMNY = 'A', M is set to N.

WORK : COMPLEX array, dimension (MAX(1,LWORK)) [out]
> On exit, if INFO = 0, WORK(1) returns the optimal LWORK.

LWORK : INTEGER [in]
> The dimension of the array WORK. LWORK >= max(1,N).
> If JOB = 'V' or 'B', LWORK >= max(1,2\*N\*N).

IWORK : INTEGER array, dimension (N+2) [out]
> If JOB = 'E', IWORK is not referenced.

INFO : INTEGER [out]
> = 0: Successful exit
> < 0: If INFO = -i, the i-th argument had an illegal value
