```fortran
subroutine strsna (
        character job,
        character howmny,
        logical, dimension( * ) select,
        integer n,
        real, dimension( ldt, * ) t,
        integer ldt,
        real, dimension( ldvl, * ) vl,
        integer ldvl,
        real, dimension( ldvr, * ) vr,
        integer ldvr,
        real, dimension( * ) s,
        real, dimension( * ) sep,
        integer mm,
        integer m,
        real, dimension( ldwork, * ) work,
        integer ldwork,
        integer, dimension( * ) iwork,
        integer info
)
```

STRSNA estimates reciprocal condition numbers for specified
eigenvalues and/or right eigenvectors of a real upper
quasi-triangular matrix T (or of any matrix Q\*T\*Q\*\*T with Q
orthogonal).

T must be in Schur canonical form (as returned by SHSEQR), that is,
block upper triangular with 1-by-1 and 2-by-2 diagonal blocks; each
2-by-2 diagonal block has its diagonal elements equal and its
off-diagonal elements of opposite sign.

## Parameters
JOB : CHARACTER\*1 [in]
> Specifies whether condition numbers are required for
> eigenvalues (S) or eigenvectors (SEP):
> = 'E': for eigenvalues only (S);
> = 'V': for eigenvectors only (SEP);
> = 'B': for both eigenvalues and eigenvectors (S and SEP).

HOWMNY : CHARACTER\*1 [in]
> = 'A': compute condition numbers for all eigenpairs;
> = 'S': compute condition numbers for selected eigenpairs
> specified by the array SELECT.

SELECT : LOGICAL array, dimension (N) [in]
> If HOWMNY = 'S', SELECT specifies the eigenpairs for which
> condition numbers are required. To select condition numbers
> for the eigenpair corresponding to a real eigenvalue w(j),
> SELECT(j) must be set to .TRUE.. To select condition numbers
> corresponding to a complex conjugate pair of eigenvalues w(j)
> and w(j+1), either SELECT(j) or SELECT(j+1) or both, must be
> set to .TRUE..
> If HOWMNY = 'A', SELECT is not referenced.

N : INTEGER [in]
> The order of the matrix T. N >= 0.

T : REAL array, dimension (LDT,N) [in]
> The upper quasi-triangular matrix T, in Schur canonical form.

LDT : INTEGER [in]
> The leading dimension of the array T. LDT >= max(1,N).

VL : REAL array, dimension (LDVL,M) [in]
> If JOB = 'E' or 'B', VL must contain left eigenvectors of T
> (or of any Q\*T\*Q\*\*T with Q orthogonal), corresponding to the
> eigenpairs specified by HOWMNY and SELECT. The eigenvectors
> must be stored in consecutive columns of VL, as returned by
> SHSEIN or STREVC.
> If JOB = 'V', VL is not referenced.

LDVL : INTEGER [in]
> The leading dimension of the array VL.
> LDVL >= 1; and if JOB = 'E' or 'B', LDVL >= N.

VR : REAL array, dimension (LDVR,M) [in]
> If JOB = 'E' or 'B', VR must contain right eigenvectors of T
> (or of any Q\*T\*Q\*\*T with Q orthogonal), corresponding to the
> eigenpairs specified by HOWMNY and SELECT. The eigenvectors
> must be stored in consecutive columns of VR, as returned by
> SHSEIN or STREVC.
> If JOB = 'V', VR is not referenced.

LDVR : INTEGER [in]
> The leading dimension of the array VR.
> LDVR >= 1; and if JOB = 'E' or 'B', LDVR >= N.

S : REAL array, dimension (MM) [out]
> If JOB = 'E' or 'B', the reciprocal condition numbers of the
> selected eigenvalues, stored in consecutive elements of the
> array. For a complex conjugate pair of eigenvalues two
> consecutive elements of S are set to the same value. Thus
> S(j), SEP(j), and the j-th columns of VL and VR all
> correspond to the same eigenpair (but not in general the
> j-th eigenpair, unless all eigenpairs are selected).
> If JOB = 'V', S is not referenced.

SEP : REAL array, dimension (MM) [out]
> If JOB = 'V' or 'B', the estimated reciprocal condition
> numbers of the selected eigenvectors, stored in consecutive
> elements of the array. For a complex eigenvector two
> consecutive elements of SEP are set to the same value. If
> the eigenvalues cannot be reordered to compute SEP(j), SEP(j)
> is set to 0; this can only occur when the true value would be
> very small anyway.
> If JOB = 'E', SEP is not referenced.

MM : INTEGER [in]
> The number of elements in the arrays S (if JOB = 'E' or 'B')
> and/or SEP (if JOB = 'V' or 'B'). MM >= M.

M : INTEGER [out]
> The number of elements of the arrays S and/or SEP actually
> used to store the estimated condition numbers.
> If HOWMNY = 'A', M is set to N.

WORK : REAL array, dimension (LDWORK,N+6) [out]
> If JOB = 'E', WORK is not referenced.

LDWORK : INTEGER [in]
> The leading dimension of the array WORK.
> LDWORK >= 1; and if JOB = 'V' or 'B', LDWORK >= N.

IWORK : INTEGER array, dimension (2\*(N-1)) [out]
> If JOB = 'E', IWORK is not referenced.

INFO : INTEGER [out]
> = 0: successful exit
> < 0: if INFO = -i, the i-th argument had an illegal value
